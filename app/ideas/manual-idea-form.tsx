"use client";

/**
 * Quick-add bar — lưu ý tưởng thủ công trong 1 thanh mảnh (không gọi Claude,
 * luôn hiển thị dù thiếu ANTHROPIC_API_KEY). Nhập tiêu đề → Enter/Lưu;
 * content pillar là tùy chọn. Tự xóa trắng ô nhập sau khi lưu thành công.
 */
import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createIdeaManual, type ManualIdeaState } from "@/app/actions/post";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm text-muted-foreground";

const initialState: ManualIdeaState = { success: false, message: "" };

export function ManualIdeaForm({ pillars }: { pillars: string[] }) {
  const [state, formAction, pending] = useActionState(createIdeaManual, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Lưu xong thì xóa trắng form để gõ tiếp ý tưởng kế (giữ nguyên khi lỗi).
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Plus className="size-4" />
        </span>
        <Input
          name="title"
          required
          maxLength={300}
          placeholder="Thêm ý tưởng nhanh — nhập tiêu đề rồi Enter…"
          aria-label="Tiêu đề ý tưởng"
          className="h-9 min-w-44 flex-1 border-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {pillars.length ? (
          <select name="pillar" aria-label="Content pillar" className={selectClass} defaultValue="">
            <option value="">Pillar (tùy chọn)</option>
            {pillars.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <Input
            name="pillar"
            placeholder="Pillar (tùy chọn)"
            aria-label="Content pillar"
            className="h-9 w-44"
          />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Đang lưu…" : "Lưu ý tưởng"}
        </Button>
      </div>
      {state.message && (
        <p
          className={`mt-2 pl-10 text-xs ${state.success ? "text-green-600" : "text-destructive"}`}
          aria-live="polite"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
