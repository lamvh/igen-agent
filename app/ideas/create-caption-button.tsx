"use client";

/**
 * Nút "Tạo caption" cho 1 ý tưởng.
 * Gọi generateCaption(ideaId) → sinh 3 post draft → redirect tới editor (khi thành công).
 * Hiển thị lỗi nếu thất bại. Ẩn khi thiếu API key.
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { generateCaption, type GenerateState } from "@/app/actions/generate";

const initialState: GenerateState = { success: false, message: "" };

export function CreateCaptionButton({ ideaId, hasApiKey }: { ideaId: number; hasApiKey: boolean }) {
  // useActionState yêu cầu (prevState, formData); bọc lại để truyền ideaId.
  const [state, action, pending] = useActionState<GenerateState, FormData>(
    () => generateCaption(ideaId),
    initialState,
  );

  if (!hasApiKey) return null;

  return (
    <form action={action} className="flex items-center gap-2">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Đang tạo…" : "Tạo caption"}
      </Button>
      {state.message && !state.success && (
        <span className="text-xs text-destructive" aria-live="polite">
          {state.message}
        </span>
      )}
    </form>
  );
}
