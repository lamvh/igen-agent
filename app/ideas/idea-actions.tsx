"use client";

/**
 * Hành động cho 1 ý tưởng — quy trình 2 bước:
 *  1. "Tạo dàn ý" → generateOutline: triển khai title thành dàn ý ngắn để xem trước.
 *  2. "Tạo caption" → generateCaption: viết caption đầy đủ (bám dàn ý nếu đã có).
 * Hiển thị dàn ý hiện có (nếu DB đã lưu) và thông báo lỗi/thành công.
 * Ẩn toàn bộ khi thiếu API key.
 */
import { useActionState, useState, useTransition } from "react";
import { Image as ImageIcon, Tag, Check, Sparkles, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DeleteButton } from "@/components/shell/delete-button";
import {
  generateOutline,
  generateCaption,
  generateImagePromptForIdea,
  type GenerateState,
} from "@/app/actions/generate";
import { deleteIdea, updateIdeaTags } from "@/app/actions/post";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  CAPTION_LENGTH_LABELS,
  type Platform,
  type CaptionLength,
} from "@/lib/ai/prompts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: GenerateState = { success: false, message: "" };

export function IdeaActions({
  ideaId,
  outline,
  imagePrompt,
  tags,
  availableTags,
  hasApiKey,
}: {
  ideaId: number;
  outline: string | null;
  imagePrompt: string | null;
  tags: string[];
  availableTags: string[];
  hasApiKey: boolean;
}) {
  // Tag được lưu ngay khi toggle; optimistic để chip cập nhật tức thì.
  const [tagState, setTagState] = useState<string[]>(tags);
  const [tagSaving, startTagSave] = useTransition();

  function toggleTag(tag: string) {
    const next = tagState.includes(tag)
      ? tagState.filter((t) => t !== tag)
      : [...tagState, tag];
    setTagState(next);
    startTagSave(() => {
      void updateIdeaTags(ideaId, next);
    });
  }

  // useActionState yêu cầu (prevState, formData); bọc lại để truyền ideaId.
  const [outlineState, outlineAction, outlinePending] = useActionState<GenerateState, FormData>(
    () => generateOutline(ideaId),
    initialState,
  );
  const [imgState, imgAction, imgPending] = useActionState<GenerateState, FormData>(
    () => generateImagePromptForIdea(ideaId),
    initialState,
  );

  // Người dùng phải tự chọn nền tảng + độ dài (placeholder rỗng, không mặc định).
  const [captionPlatform, setCaptionPlatform] = useState<Platform | "">("");
  const [captionLength, setCaptionLength] = useState<CaptionLength | "">("");
  const [captionPending, startCaption] = useTransition();
  const [captionError, setCaptionError] = useState("");

  const canCreateCaption = captionPlatform !== "" && captionLength !== "";

  function onCreateCaption() {
    if (!canCreateCaption) {
      setCaptionError("Vui lòng chọn nền tảng và độ dài.");
      return;
    }
    setCaptionError("");
    startCaption(async () => {
      const res = await generateCaption(ideaId, captionPlatform as Platform, captionLength as CaptionLength);
      // Thành công sẽ redirect; chỉ tới đây khi lỗi.
      if (!res.success) setCaptionError(res.message);
    });
  }

  const error =
    (!outlineState.success && outlineState.message) ||
    captionError ||
    (!imgState.success && imgState.message) ||
    "";

  return (
    <div className="space-y-3">
      {hasApiKey && (
        <>
          {/* Hành động chính: chọn nền tảng + độ dài rồi Tạo caption. */}
          <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Nền tảng"
                value={captionPlatform}
                onChange={(e) => setCaptionPlatform(e.target.value as Platform)}
                disabled={captionPending}
                className={`h-8 rounded-lg border border-input bg-background px-2 text-xs ${
                  captionPlatform === "" ? "text-muted-foreground" : ""
                }`}
              >
                <option value="" disabled>
                  Chọn nền tảng…
                </option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Độ dài"
                value={captionLength}
                onChange={(e) => setCaptionLength(e.target.value as CaptionLength)}
                disabled={captionPending}
                className={`h-8 rounded-lg border border-input bg-background px-2 text-xs ${
                  captionLength === "" ? "text-muted-foreground" : ""
                }`}
              >
                <option value="" disabled>
                  Chọn độ dài…
                </option>
                {(Object.keys(CAPTION_LENGTH_LABELS) as CaptionLength[]).map((k) => (
                  <option key={k} value={k}>
                    {CAPTION_LENGTH_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onCreateCaption}
              disabled={captionPending || !canCreateCaption}
              className="w-full"
            >
              {captionPending ? <Spinner /> : <Sparkles className="size-4" />}
              {captionPending ? "Đang tạo caption…" : "Tạo caption"}
            </Button>
          </div>

          {/* Hành động phụ: icon nhỏ, nhẹ. */}
          <div className="flex items-center gap-1">
            <form action={outlineAction} className="flex-1">
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={outlinePending}
                className="w-full text-xs text-muted-foreground"
                title={outline ? "Tạo lại dàn ý" : "Tạo dàn ý"}
              >
                {outlinePending ? <Spinner /> : <ListChecks className="size-4" />}
                {outline ? "Dàn ý ✓" : "Dàn ý"}
              </Button>
            </form>
            <form action={imgAction} className="flex-1">
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={imgPending}
                className="w-full text-xs text-muted-foreground"
                title={imagePrompt ? "Tạo lại prompt ảnh" : "Tạo prompt ảnh"}
              >
                {imgPending ? <Spinner /> : <ImageIcon className="size-4" />}
                {imagePrompt ? "Prompt ✓" : "Prompt ảnh"}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* Tag + Xóa: tách riêng, nhẹ. */}
      <div className="flex items-center justify-between">
        {availableTags.length > 0 ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground">
                <Tag className="size-3.5" />
                {tagState.length > 0 ? `${tagState.length} tag` : "Gắn tag"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gắn tag</DialogTitle>
                <DialogDescription>Chọn tag để phân loại ý tưởng này.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const active = tagState.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={tagSaving}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-muted"
                      }`}
                    >
                      {active && <Check className="size-3.5" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <span />
        )}
        <DeleteButton
          action={() => deleteIdea(ideaId)}
          title="Xóa ý tưởng này?"
          description="Ý tưởng sẽ bị xóa. Các caption đã tạo từ nó vẫn được giữ lại."
        />
      </div>

      {/* Dàn ý + prompt ảnh hiển thị trong panel chi tiết (IdeaCard), không inline. */}

      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
