"use client";

/**
 * Nút copy 1 đoạn text vào clipboard, đổi nhãn "Đã copy" tạm thời để phản hồi.
 */
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard có thể bị chặn — bỏ qua, không làm hỏng UI */
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={onCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Đã copy" : label}
    </Button>
  );
}
