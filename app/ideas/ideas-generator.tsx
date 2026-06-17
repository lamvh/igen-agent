"use client";

/**
 * Idea Generator (Client Component).
 * Chọn pillar + nền tảng → sinh ý tưởng. Ẩn nút generate nếu thiếu API key.
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateIdeas, type GenerateState } from "@/app/actions/generate";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/ai/prompts";

const initialState: GenerateState = { success: false, message: "" };

export function IdeasGenerator({
  pillars,
  hasApiKey,
}: {
  pillars: string[];
  hasApiKey: boolean;
}) {
  const [state, formAction, pending] = useActionState(generateIdeas, initialState);

  if (!hasApiKey) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Chưa cấu hình <code className="font-mono">ANTHROPIC_API_KEY</code>. Thêm key vào{" "}
        <code className="font-mono">.env.local</code> rồi khởi động lại để sinh ý tưởng tự động.
        Bạn vẫn có thể tạo/sửa caption thủ công trong trình soạn thảo.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pillar">Content pillar</Label>
          {pillars.length ? (
            <select
              id="pillar"
              name="pillar"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              defaultValue={pillars[0]}
            >
              {pillars.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <Input id="pillar" name="pillar" placeholder="VD: Mẹo sử dụng sản phẩm" />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="platform">Nền tảng</Label>
          <select
            id="platform"
            name="platform"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue="facebook"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang sinh…" : "Sinh ý tưởng"}
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
