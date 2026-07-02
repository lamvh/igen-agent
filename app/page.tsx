/**
 * Dashboard (/) — Server Component.
 * Tổng quan số liệu (ý tưởng, post theo trạng thái) + điều hướng nhanh.
 */
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/app/actions/stats";
import { NAV_ITEMS } from "@/lib/nav";
import { UsageGuide } from "@/app/usage-guide";

// Đọc số liệu DB lúc request → luôn hiển thị dữ liệu mới nhất.
export const dynamic = "force-dynamic";

// Mỗi stat một tông màu riêng (nền nhạt + chữ đậm) để bảng số sống động.
function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${tint}`}>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-70">{label}</div>
    </div>
  );
}

// Bỏ "/" (trang hiện tại) khỏi lưới card điều hướng.
const NAV = NAV_ITEMS.filter((n) => n.href !== "/");

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <h1 className="bg-linear-to-r from-violet-600 to-indigo-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-violet-400 dark:to-indigo-300">
        Content Creator
      </h1>
      <p className="mt-2 text-muted-foreground">
        Sinh nội dung + quản lý lịch đăng cho thương hiệu của bạn.
      </p>

      {!stats.hasBrand ? (
        <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-accent/40 p-4 text-sm text-muted-foreground">
          Bắt đầu bằng cách{" "}
          <Link href="/settings?tab=brand" className="font-medium text-primary underline underline-offset-2">
            thiết lập Brand Profile
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ý tưởng" value={stats.ideas} tint="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300" />
          <Stat label="Nháp" value={stats.draft} tint="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300" />
          <Stat label="Đã lên lịch" value={stats.scheduled} tint="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300" />
          <Stat label="Đã đăng" value={stats.posted} tint="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300" />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} className="group block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
                <CardHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{n.label}</CardTitle>
                  <CardDescription>{n.desc}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm font-medium text-primary/80 transition-colors group-hover:text-primary">
                  {n.cta}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <UsageGuide />
      </div>
    </div>
  );
}
