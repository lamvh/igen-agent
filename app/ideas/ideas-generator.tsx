"use client";

/**
 * Idea Generator (Client Component).
 * Chọn pillar + nền tảng → sinh ý tưởng. Ẩn nút generate nếu thiếu API key.
 */
import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { generateIdeas, type GenerateState } from "@/app/actions/generate";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  IDEA_LENGTH_LABELS,
  IDEA_GOAL_LABELS,
  type IdeaLength,
  type IdeaGoal,
} from "@/lib/ai/prompts";

const COUNT_OPTIONS = [1, 2, 3, 5, 6, 8, 10];
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

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
    <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b pb-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold">Sinh ý tưởng bằng AI</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pillar">Content pillar</Label>
          {pillars.length ? (
            <select id="pillar" name="pillar" className={selectClass} defaultValue={pillars[0]}>
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
          <select id="platform" name="platform" className={selectClass} defaultValue="facebook">
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="count">Số lượng ý tưởng</Label>
          <select id="count" name="count" className={selectClass} defaultValue="6">
            {COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} ý tưởng
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="length">Độ dài tiêu đề</Label>
          <select id="length" name="length" className={selectClass} defaultValue="medium">
            {(Object.keys(IDEA_LENGTH_LABELS) as IdeaLength[]).map((k) => (
              <option key={k} value={k}>
                {IDEA_LENGTH_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Mục tiêu bài</Label>
          <select id="goal" name="goal" className={selectClass} defaultValue="engagement">
            {(Object.keys(IDEA_GOAL_LABELS) as IdeaGoal[]).map((k) => (
              <option key={k} value={k}>
                {IDEA_GOAL_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="target">
            Đối tượng mục tiêu <span className="text-muted-foreground">(tùy chọn)</span>
          </Label>
          <Input id="target" name="target" placeholder="VD: mẹ bỉm sữa 25–35 tuổi" maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tone">
            Tông giọng <span className="text-muted-foreground">(tùy chọn)</span>
          </Label>
          <Input id="tone" name="tone" placeholder="VD: vui vẻ, gần gũi" maxLength={200} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Để trống đối tượng/tông giọng sẽ dùng thông tin từ Brand Profile.
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <Sparkles className="size-4" />}
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
