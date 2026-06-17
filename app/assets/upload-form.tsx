"use client";

/**
 * Form upload ảnh (Client Component) + nút "Sinh ảnh AI" (disable nếu thiếu GEMINI_API_KEY).
 */
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadAsset, type UploadState } from "@/app/actions/asset";

const initialState: UploadState = { success: false, message: "" };

export function UploadForm({ hasGeminiKey }: { hasGeminiKey: boolean }) {
  const [state, formAction, pending] = useActionState(uploadAsset, initialState);

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="max-w-xs"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Đang tải…" : "Tải ảnh lên"}
        </Button>
        <Button type="button" variant="outline" disabled title={hasGeminiKey ? "" : "Cần GEMINI_API_KEY"}>
          Sinh ảnh AI {hasGeminiKey ? "" : "(cần key)"}
        </Button>
        {state.message && (
          <span
            className={state.success ? "text-sm text-green-600" : "text-sm text-destructive"}
            aria-live="polite"
          >
            {state.message}
          </span>
        )}
      </form>

      {!hasGeminiKey && (
        <p className="text-xs text-muted-foreground">
          Sinh ảnh AI sẽ bật khi có <code className="font-mono">GEMINI_API_KEY</code>. Lấy key tại{" "}
          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            aistudio.google.com
          </a>{" "}
          rồi thêm vào <code className="font-mono">.env.local</code>.
        </p>
      )}
    </div>
  );
}
