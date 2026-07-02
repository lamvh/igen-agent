"use client";

/**
 * Nút sinh 1 đoạn prompt (KHÔNG gọi Claude, không tốn token) rồi hiện + cho copy.
 * Dùng chung cho copy-prompt ý tưởng/dàn ý/caption — người dùng dán prompt sang
 * Claude app, rồi dán kết quả ngược lại vào ô tương ứng trong app.
 */
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CopyButton } from "@/components/shell/copy-button";

type PromptResult = { success: boolean; message: string; prompt?: string };

export function CopyPromptButton({
  action,
  label = "Copy prompt",
}: {
  action: () => Promise<PromptResult>;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [error, setError] = useState("");

  function onClick() {
    setError("");
    start(async () => {
      const res = await action();
      if (res.success && res.prompt) setPrompt(res.prompt);
      else setError(res.message || "Không tạo được prompt.");
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Spinner /> : <Sparkles className="size-4" />}
        {pending ? "Đang tạo…" : label}
      </Button>
      {error && (
        <p className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
      {prompt && (
        <div className="rounded-lg border border-dashed p-2.5">
          <div className="mb-2 flex justify-end">
            <CopyButton text={prompt} label="Copy vào clipboard" />
          </div>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {prompt}
          </p>
        </div>
      )}
    </div>
  );
}
