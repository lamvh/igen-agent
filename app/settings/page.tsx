/**
 * Trang Cài đặt (/settings) — Server Component.
 * Hiển thị trạng thái API key + test Claude. Key cấu hình qua .env.local (không nhập từ UI để tránh lộ).
 */
import Link from "next/link";
import { getKeyStatus } from "@/app/actions/settings";
import { getBrand } from "@/app/actions/brand";
import { getUsageSummary } from "@/lib/ai/usage";
import { ClaudeTestButton } from "./claude-test-button";
import { BrandForm } from "@/app/brand/brand-form";

export const metadata = { title: "Cài đặt" };

type Tab = "brand" | "api";
const TABS: { id: Tab; label: string }[] = [
  { id: "brand", label: "Thương hiệu" },
  { id: "api", label: "API & Sử dụng" },
];

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

// Định dạng số token có dấu phân cách nghìn (tiếng Việt).
const fmtInt = new Intl.NumberFormat("vi-VN");
const fmtUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "api" ? "api" : "brand";

  const [status, usage, brand] = await Promise.all([
    getKeyStatus(),
    getUsageSummary(),
    getBrand(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Tab điều hướng (server-side qua searchParams). */}
      <div className="mb-6 flex gap-1 rounded-xl border bg-muted/40 p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={`flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "brand" ? (
        <section>
          <p className="mb-6 text-sm text-muted-foreground">
            {brand
              ? "Cập nhật thông tin thương hiệu — dùng làm ngữ cảnh cho sinh nội dung."
              : "Thiết lập thương hiệu của bạn để bắt đầu sinh nội dung."}
          </p>
          <BrandForm brand={brand} />
        </section>
      ) : (
        <section>
          <p className="mb-6 text-sm text-muted-foreground">
            API key cấu hình trong <code className="font-mono">.env.local</code> rồi khởi động lại
            server. Không nhập key qua giao diện để tránh lộ.
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

        {/* Mức sử dụng: token đã tiêu TRONG app + chi phí ước tính. */}
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Mức sử dụng (ước tính)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Token Claude đã dùng trong app này và chi phí ước tính theo đơn giá Opus 4.8
            ($5/$25 mỗi triệu token input/output).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-lg font-bold">{fmtInt.format(usage.totalInputTokens)}</div>
              <div className="text-xs text-muted-foreground">Token input</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-lg font-bold">{fmtInt.format(usage.totalOutputTokens)}</div>
              <div className="text-xs text-muted-foreground">Token output</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-lg font-bold">{usage.callCount}</div>
              <div className="text-xs text-muted-foreground">Lượt gọi</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-accent/40 p-3">
              <div className="text-lg font-bold text-primary">
                {fmtUsd.format(usage.estimatedCostUsd)}
              </div>
              <div className="text-xs text-muted-foreground">Chi phí ước tính</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ⚠️ Đây là chi phí đã tiêu trong app, <strong>không phải số dư còn lại</strong>.
            Anthropic không cung cấp API số dư — xem số dư &amp; usage thật tại{" "}
            <a
              href="https://console.anthropic.com/settings/billing"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              Anthropic Console → Billing
            </a>
            .
          </p>
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
        </section>
      )}
    </div>
  );
}
