"use client";

/**
 * Hành động cho 1 ý tưởng:
 *  - IdeaActions: gắn tag + xóa (hiển thị trên card).
 *  - CaptionCreator: chọn nền tảng + độ dài + Tạo caption (hiển thị trong panel chi tiết).
 * Tách riêng để card tối giản, mọi thao tác sinh nội dung gom vào panel.
 */
import { useState, useTransition } from "react";
import { Tag, Check, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { DeleteButton } from "@/components/shell/delete-button";
import { generateCaption } from "@/app/actions/generate";
import { addBrandTag, removeBrandTag } from "@/app/actions/brand";
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

/** Chọn nền tảng + độ dài → Tạo caption. Dùng trong panel chi tiết. */
export function CaptionCreator({ ideaId }: { ideaId: number }) {
  // Người dùng phải tự chọn nền tảng + độ dài (placeholder rỗng, không mặc định).
  const [platform, setPlatform] = useState<Platform | "">("");
  const [length, setLength] = useState<CaptionLength | "">("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const canCreate = platform !== "" && length !== "";

  function onCreate() {
    if (!canCreate) {
      setError("Vui lòng chọn nền tảng và độ dài.");
      return;
    }
    setError("");
    start(async () => {
      const res = await generateCaption(ideaId, platform as Platform, length as CaptionLength);
      // Thành công sẽ redirect; chỉ tới đây khi lỗi.
      if (!res.success) setError(res.message);
    });
  }

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Nền tảng"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          disabled={pending}
          className={`h-9 rounded-lg border border-input bg-background px-2 text-sm ${
            platform === "" ? "text-muted-foreground" : ""
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
          value={length}
          onChange={(e) => setLength(e.target.value as CaptionLength)}
          disabled={pending}
          className={`h-9 rounded-lg border border-input bg-background px-2 text-sm ${
            length === "" ? "text-muted-foreground" : ""
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
        onClick={onCreate}
        disabled={pending || !canCreate}
        className="w-full"
      >
        {pending ? <Spinner /> : <Sparkles className="size-4" />}
        {pending ? "Đang tạo caption…" : "Tạo caption"}
      </Button>
      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

/** Gắn tag + xóa ý tưởng. Hiển thị gọn ở đáy card. */
export function IdeaActions({
  ideaId,
  tags,
  availableTags,
}: {
  ideaId: number;
  tags: string[];
  availableTags: string[];
}) {
  // Tag của ý tưởng này (đã gắn) — optimistic.
  const [tagState, setTagState] = useState<string[]>(tags);
  const [tagSaving, startTagSave] = useTransition();

  // Danh sách tag chung của brand — cho phép tạo/xóa ngay trong modal.
  const [tagList, setTagList] = useState<string[]>(availableTags);
  const [newTag, setNewTag] = useState("");
  const [tagMgmtPending, startTagMgmt] = useTransition();
  const [tagError, setTagError] = useState("");

  function toggleTag(tag: string) {
    const next = tagState.includes(tag)
      ? tagState.filter((t) => t !== tag)
      : [...tagState, tag];
    setTagState(next);
    startTagSave(() => {
      void updateIdeaTags(ideaId, next);
    });
  }

  function onAddTag() {
    const name = newTag.trim();
    if (!name) return;
    setTagError("");
    startTagMgmt(async () => {
      const res = await addBrandTag(name);
      setTagList(res.tags);
      if (res.success) {
        setNewTag("");
        toggleTag(name); // tự gắn tag vừa tạo
      } else {
        setTagError(res.message);
      }
    });
  }

  function onRemoveTag(tag: string) {
    setTagError("");
    startTagMgmt(async () => {
      const res = await removeBrandTag(tag);
      setTagList(res.tags);
      if (!res.success) setTagError(res.message);
      else setTagState((prev) => prev.filter((t) => t !== tag)); // gỡ khỏi ý tưởng nếu đang gắn
    });
  }

  return (
    <div className="flex items-center justify-between">
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground">
            <Tag className="size-3.5" />
            {tagState.length > 0 ? `${tagState.length} tag` : "Gắn tag"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag</DialogTitle>
            <DialogDescription>
              Chọn tag để gắn cho ý tưởng, hoặc tạo/xóa tag trong danh sách chung.
            </DialogDescription>
          </DialogHeader>

          {/* Danh sách tag: bấm chip để gắn/bỏ; nút × để xóa khỏi danh sách chung. */}
          {tagList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tagList.map((tag) => {
                const active = tagState.includes(tag);
                return (
                  <span
                    key={tag}
                    className={`group inline-flex items-center gap-1 rounded-full border pr-1 text-sm transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-input"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={tagSaving}
                      className="inline-flex items-center gap-1 rounded-full py-1 pl-3"
                    >
                      {active && <Check className="size-3.5" />}
                      {tag}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag)}
                      disabled={tagMgmtPending}
                      aria-label={`Xóa tag ${tag}`}
                      className={`rounded-full p-0.5 transition-colors ${
                        active ? "hover:bg-primary-foreground/20" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có tag nào. Tạo tag đầu tiên bên dưới.
            </p>
          )}

          {/* Ô tạo tag mới. */}
          <div className="flex items-center gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddTag();
                }
              }}
              placeholder="Tạo tag mới…"
              maxLength={40}
              disabled={tagMgmtPending}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onAddTag}
              disabled={tagMgmtPending || !newTag.trim()}
            >
              {tagMgmtPending ? <Spinner /> : <Plus className="size-4" />}
              Thêm
            </Button>
          </div>
          {tagError && <p className="text-xs text-destructive">{tagError}</p>}
        </DialogContent>
      </Dialog>

      <DeleteButton
        action={() => deleteIdea(ideaId)}
        title="Xóa ý tưởng này?"
        description="Ý tưởng sẽ bị xóa. Các caption đã tạo từ nó vẫn được giữ lại."
      />
    </div>
  );
}
