"use client";

/**
 * Nút test ANTHROPIC_API_KEY (Client Component) — gọi 1 lời nhỏ tới Claude.
 */
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { testClaudeKey } from "@/app/actions/settings";

export function ClaudeTestButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function run() {
    startTransition(async () => {
      setResult(await testClaudeKey());
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" size="sm" variant="outline" onClick={run} disabled={disabled || pending}>
        {pending ? "Đang test…" : "Test key"}
      </Button>
      {result && (
        <span
          className={result.success ? "text-sm text-green-600" : "text-sm text-destructive"}
          aria-live="polite"
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
