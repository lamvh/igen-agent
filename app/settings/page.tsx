/**
 * Trang Cài đặt (/settings) — Server Component.
 * Hiển thị trạng thái API key + test Claude. Key cấu hình qua .env.local (không nhập từ UI để tránh lộ).
 */
import Link from "next/link";
import { getKeyStatus } from "@/app/actions/settings";
import { ClaudeTestButton } from "./claude-test-button";

export const metadata = { title: "Cài đặt" };

// Đọc trạng thái env lúc request (key có thể đổi giữa các lần khởi động).
export const dynamic = "force-dynamic";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs ${
        ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {ok ? "Đã cấu hình" : "Chưa có"}
    </span>
  );
}

export default async function SettingsPage() {
  const status = await getKeyStatus();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        API key cấu hình trong <code className="font-mono">.env.local</code> rồi khởi động lại server.
        Không nhập key qua giao diện để tránh lộ.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">Claude (Anthropic)</h2>
              <p className="text-xs text-muted-foreground">Sinh ý tưởng + caption.</p>
            </div>
            <StatusBadge ok={status.anthropic} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Biến: <code className="font-mono">ANTHROPIC_API_KEY</code> · Lấy key tại{" "}
            <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="underline">
              console.anthropic.com
            </a>
          </p>
          <div className="mt-3">
            <ClaudeTestButton disabled={!status.anthropic} />
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium">Gemini (Google)</h2>
              <p className="text-xs text-muted-foreground">Sinh ảnh AI (sắp có).</p>
            </div>
            <StatusBadge ok={status.gemini} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Biến: <code className="font-mono">GEMINI_API_KEY</code> · Lấy key tại{" "}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="underline">
              aistudio.google.com
            </a>
          </p>
        </div>
      </div>

      <Link href="/" className="mt-8 inline-block text-sm text-muted-foreground underline">
        ← Về dashboard
      </Link>
    </main>
  );
}
