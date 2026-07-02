"use client";

/**
 * Form lưu ý tưởng thủ công — không gọi Claude, luôn hiển thị dù thiếu
 * ANTHROPIC_API_KEY. Chỉ cần tiêu đề; content pillar là tùy chọn.
 */
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createIdeaManual, type ManualIdeaState } from "@/app/actions/post";

const selectClass = "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

const initialState: ManualIdeaState = { success: false, message: "" };

export function ManualIdeaForm({ pillars }: { pillars: string[] }) {
  const [state, formAction, pending] = useActionState(createIdeaManual, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b pb-3">
        <Plus className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold">Lưu ý tưởng thủ công</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-title">Tiêu đề</Label>
        <Input id="manual-title" name="title" placeholder="VD: 5 mẹo pha cà phê tại nhà" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="manual-pillar">
          Content pillar <span className="text-muted-foreground">(tùy chọn)</span>
        </Label>
        {pillars.length ? (
          <select id="manual-pillar" name="pillar" className={selectClass} defaultValue="">
            <option value="">(không chọn)</option>
            {pillars.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <Input id="manual-pillar" name="pillar" placeholder="VD: Mẹo sử dụng sản phẩm" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Đang lưu…" : "Lưu ý tưởng"}
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
