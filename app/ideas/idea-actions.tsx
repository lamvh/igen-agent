"use client";

/**
 * Hành động cho 1 ý tưởng — quy trình 2 bước:
 *  1. "Tạo dàn ý" → generateOutline: triển khai title thành dàn ý ngắn để xem trước.
 *  2. "Tạo caption" → generateCaption: viết caption đầy đủ (bám dàn ý nếu đã có).
 * Hiển thị dàn ý hiện có (nếu DB đã lưu) và thông báo lỗi/thành công.
 * Ẩn toàn bộ khi thiếu API key.
 */
import { useActionState, useState, useTransition } from "react";
import { Image as ImageIcon, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DeleteButton } from "@/components/shell/delete-button";
import { CopyButton } from "@/components/shell/copy-button";
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

  // Tạo caption theo nền tảng + độ dài chọn (mặc định FB, vừa). Redirect khi thành công.
  const [captionPlatform, setCaptionPlatform] = useState<Platform>("facebook");
  const [captionLength, setCaptionLength] = useState<CaptionLength>("medium");
  const [captionPending, startCaption] = useTransition();
  const [captionError, setCaptionError] = useState("");

  function onCreateCaption() {
    setCaptionError("");
    startCaption(async () => {
      const res = await generateCaption(ideaId, captionPlatform, captionLength);
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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Nút sinh AI chỉ hiện khi có API key; xóa luôn cho phép. */}
        {hasApiKey && (
          <>
            <form action={outlineAction}>
              <Button type="submit" size="sm" variant="ghost" disabled={outlinePending}>
                {outlinePending && <Spinner />}
                {outlinePending ? "Đang phác…" : outline ? "Tạo lại dàn ý" : "Tạo dàn ý"}
              </Button>
            </form>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Nền tảng"
                value={captionPlatform}
                onChange={(e) => setCaptionPlatform(e.target.value as Platform)}
                disabled={captionPending}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
              >
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
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs"
              >
                {(Object.keys(CAPTION_LENGTH_LABELS) as CaptionLength[]).map((k) => (
                  <option key={k} value={k}>
                    {CAPTION_LENGTH_LABELS[k]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCreateCaption}
                disabled={captionPending}
              >
                {captionPending && <Spinner />}
                {captionPending ? "Đang tạo…" : "Tạo caption"}
              </Button>
            </div>
            <form action={imgAction}>
              <Button type="submit" size="sm" variant="ghost" disabled={imgPending}>
                {imgPending ? <Spinner /> : <ImageIcon className="size-4" />}
                {imgPending ? "Đang tạo…" : imagePrompt ? "Tạo lại prompt ảnh" : "Tạo prompt ảnh"}
              </Button>
            </form>
          </>
        )}
        {availableTags.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="ghost">
                <Tag className="size-4" />
                Tag
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
        )}
        <DeleteButton
          action={() => deleteIdea(ideaId)}
          title="Xóa ý tưởng này?"
          description="Ý tưởng sẽ bị xóa. Các caption đã tạo từ nó vẫn được giữ lại."
        />
      </div>

      {tagState.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {tagState.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {outline && (
        <pre className="mt-1 max-w-md whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-left text-xs text-muted-foreground">
          {outline}
        </pre>
      )}

      {imagePrompt && (
        <div className="mt-1 max-w-md rounded-lg border border-primary/20 bg-accent/40 p-3 text-left">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-primary">Prompt ảnh (Gemini)</span>
            <CopyButton text={imagePrompt} />
          </div>
          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{imagePrompt}</p>
        </div>
      )}

      {error && (
        <p className="text-right text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
