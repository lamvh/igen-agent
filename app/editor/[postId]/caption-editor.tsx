"use client";

/**
 * Caption Editor (Client Component).
 * Sửa caption + hashtags của 1 post, lưu thủ công qua saveCaption.
 * "Viết lại bằng AI" gọi regenerateCaption (ghi đè DB) rồi refresh để lấy bản mới.
 * Hashtags nhập dạng văn bản (cách nhau bởi khoảng trắng/dấu phẩy), parse ở server.
 */
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/shell/copy-button";
import { CopyPromptButton } from "@/components/shell/copy-prompt-button";
import { saveCaption, type PostView, type SaveCaptionState } from "@/app/actions/post";
import {
  regenerateCaption,
  generateImagePromptForPost,
  buildCaptionPrompt,
} from "@/app/actions/generate";
import { CAPTION_LENGTH_LABELS, type CaptionLength } from "@/lib/ai/prompts";

const initialState: SaveCaptionState = { success: false, message: "" };

export function CaptionEditor({
  post,
  hasApiKey,
  onCaptionChange,
  onHashtagsChange,
}: {
  post: PostView;
  hasApiKey: boolean;
  /** Báo caption thay đổi (cho preview real-time). */
  onCaptionChange?: (value: string) => void;
  /** Báo hashtags (đã parse) thay đổi (cho preview real-time). */
  onHashtagsChange?: (value: string[]) => void;
}) {
  const [state, formAction, pending] = useActionState(saveCaption, initialState);
  const router = useRouter();
  const [regenPending, startRegen] = useTransition();
  const [regenError, setRegenError] = useState("");
  const [imgPending, startImg] = useTransition();
  const [imgError, setImgError] = useState("");
  // Độ dài mong muốn cho prompt content (copy sang AI agent bất kỳ).
  const [promptLength, setPromptLength] = useState<CaptionLength>("medium");

  // Controlled để preview cập nhật theo từng phím gõ; đồng bộ lại khi post đổi
  // (vd sau regenerate + router.refresh).
  const [caption, setCaption] = useState(post.caption);
  const [hashtagsRaw, setHashtagsRaw] = useState(post.hashtags.join(" "));

  useEffect(() => setCaption(post.caption), [post.caption]);
  // post.hashtags là mảng mới mỗi render → join để so sánh ổn định.
  const hashtagsKey = post.hashtags.join(" ");
  useEffect(() => setHashtagsRaw(hashtagsKey), [hashtagsKey]);

  // Parse hashtags từ ô nhập (bỏ #, tách theo khoảng trắng/dấu phẩy) cho preview.
  const parsedHashtags = hashtagsRaw
    .split(/[\s,]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean);

  useEffect(() => onCaptionChange?.(caption), [caption, onCaptionChange]);
  useEffect(() => onHashtagsChange?.(parsedHashtags), [hashtagsRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset thông báo lỗi regenerate khi post đổi (đã có bản mới).
  useEffect(() => setRegenError(""), [post.caption]);

  function onRegenerate() {
    setRegenError("");
    startRegen(async () => {
      const res = await regenerateCaption(post.id);
      if (res.success) router.refresh();
      else setRegenError(res.message);
    });
  }

  function onImagePrompt() {
    setImgError("");
    startImg(async () => {
      const res = await generateImagePromptForPost(post.id);
      if (res.success) router.refresh();
      else setImgError(res.message);
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="postId" value={post.id} />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="caption">Caption</Label>
          {hasApiKey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={regenPending}
              className="text-primary hover:text-primary"
            >
              {regenPending ? <Spinner /> : <Sparkles className="size-4" />}
              {regenPending ? "Đang viết lại…" : "Viết lại bằng AI"}
            </Button>
          )}
        </div>
        <Textarea
          id="caption"
          name="caption"
          rows={10}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        {regenError && <p className="text-sm text-destructive">{regenError}</p>}
        {/* Prompt content = brief đầy đủ (ý tưởng + dàn ý + brand context) để đưa
            sang AI agent bất kỳ; độ dài do người dùng chọn. */}
        <div className="flex flex-wrap items-start gap-2">
          <select
            aria-label="Độ dài content"
            value={promptLength}
            onChange={(e) => setPromptLength(e.target.value as CaptionLength)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
          >
            {(Object.keys(CAPTION_LENGTH_LABELS) as CaptionLength[]).map((k) => (
              <option key={k} value={k}>
                {CAPTION_LENGTH_LABELS[k]}
              </option>
            ))}
          </select>
          <div className="min-w-0 flex-1">
            <CopyPromptButton
              action={() => buildCaptionPrompt(post.id, promptLength)}
              label="Copy prompt content"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hashtags">Hashtags</Label>
        <Input
          id="hashtags"
          name="hashtags"
          value={hashtagsRaw}
          onChange={(e) => setHashtagsRaw(e.target.value)}
          placeholder="cachpha caphe sang"
        />
        <p className="text-xs text-muted-foreground">
          Cách nhau bởi khoảng trắng hoặc dấu phẩy; không cần gõ dấu #.
        </p>
      </div>

      {/* Prompt tạo ảnh cho Gemini — sinh bằng Claude, copy dán sang Gemini sau. */}
      {hasApiKey && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Prompt ảnh (Gemini)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onImagePrompt}
              disabled={imgPending}
              className="text-primary hover:text-primary"
            >
              {imgPending ? <Spinner /> : <ImageIcon className="size-4" />}
              {imgPending ? "Đang tạo…" : post.imagePrompt ? "Tạo lại prompt ảnh" : "Tạo prompt ảnh"}
            </Button>
          </div>
          {post.imagePrompt ? (
            <div className="rounded-lg border border-primary/20 bg-accent/40 p-3">
              <div className="mb-2 flex justify-end">
                <CopyButton text={post.imagePrompt} />
              </div>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">{post.imagePrompt}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sinh 1 prompt tiếng Anh để tạo ảnh minh họa cho caption này.
            </p>
          )}
          {imgError && <p className="text-sm text-destructive">{imgError}</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Đang lưu…" : "Lưu caption"}
        </Button>
        {state.message && (
          <p
            className={state.success ? "text-sm text-green-600" : "text-sm text-destructive"}
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
