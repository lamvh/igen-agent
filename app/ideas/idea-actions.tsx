"use client";

/**
 * Hành động cho 1 ý tưởng — quy trình 2 bước:
 *  1. "Tạo dàn ý" → generateOutline: triển khai title thành dàn ý ngắn để xem trước.
 *  2. "Tạo caption" → generateCaption: viết caption đầy đủ (bám dàn ý nếu đã có).
 * Hiển thị dàn ý hiện có (nếu DB đã lưu) và thông báo lỗi/thành công.
 * Ẩn toàn bộ khi thiếu API key.
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { generateOutline, generateCaption, type GenerateState } from "@/app/actions/generate";

const initialState: GenerateState = { success: false, message: "" };

export function IdeaActions({
  ideaId,
  outline,
  hasApiKey,
}: {
  ideaId: number;
  outline: string | null;
  hasApiKey: boolean;
}) {
  // useActionState yêu cầu (prevState, formData); bọc lại để truyền ideaId.
  const [outlineState, outlineAction, outlinePending] = useActionState<GenerateState, FormData>(
    () => generateOutline(ideaId),
    initialState,
  );
  const [captionState, captionAction, captionPending] = useActionState<GenerateState, FormData>(
    () => generateCaption(ideaId),
    initialState,
  );

  if (!hasApiKey) return null;

  const error =
    (!outlineState.success && outlineState.message) ||
    (!captionState.success && captionState.message) ||
    "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action={outlineAction}>
          <Button type="submit" size="sm" variant="ghost" disabled={outlinePending}>
            {outlinePending ? "Đang phác…" : outline ? "Tạo lại dàn ý" : "Tạo dàn ý"}
          </Button>
        </form>
        <form action={captionAction}>
          <Button type="submit" size="sm" variant="outline" disabled={captionPending}>
            {captionPending ? "Đang tạo…" : "Tạo caption"}
          </Button>
        </form>
      </div>

      {outline && (
        <pre className="mt-1 max-w-md whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-left text-xs text-muted-foreground">
          {outline}
        </pre>
      )}

      {error && (
        <p className="text-right text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
