"use client";

/**
 * Idea Generator (Client Component) — card gập/mở để không chiếm chỗ của
 * danh sách ý tưởng. Chọn pillar + tùy chọn → sinh ý tưởng bằng AI, hoặc
 * copy prompt sang AI agent ngoài khi thiếu API key.
 */
import { useActionState, useRef, useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CopyPromptButton } from "@/components/shell/copy-prompt-button";
import { generateIdeas, buildIdeaPrompt, type GenerateState } from "@/app/actions/generate";
import {
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
  const formRef = useRef<HTMLFormElement>(null);
  // Gập mặc định để danh sách ý tưởng hiện ngay trên fold; mở giữ nguyên
  // trong suốt phiên (state client không mất khi router.refresh).
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl p-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-100 to-indigo-100 text-primary dark:from-violet-950/60 dark:to-indigo-950/60">
            <Sparkles className="size-4" />
          </span>
          <span className="font-heading text-sm font-semibold">Sinh ý tưởng bằng AI</span>
          {!hasApiKey && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Chưa có API key — dùng copy prompt
            </span>
          )}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form ref={formRef} action={formAction} className="space-y-4 border-t p-4">
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
              <Input
                id="target"
                name="target"
                placeholder="VD: mẹ bỉm sữa 25–35 tuổi"
                maxLength={200}
              />
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
            {hasApiKey ? (
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : <Sparkles className="size-4" />}
                {pending ? "Đang sinh…" : "Sinh ý tưởng"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Chưa cấu hình <code className="font-mono">ANTHROPIC_API_KEY</code> — không thể sinh
                tự động. Copy prompt bên dưới để dùng với Claude app.
              </p>
            )}
            {state.message && (
              <p
                className={state.success ? "text-sm text-green-600" : "text-sm text-destructive"}
                aria-live="polite"
              >
                {state.message}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <CopyPromptButton
              action={() => buildIdeaPrompt(new FormData(formRef.current!))}
              label="Copy prompt ý tưởng"
            />
          </div>
        </form>
      )}
    </section>
  );
}
