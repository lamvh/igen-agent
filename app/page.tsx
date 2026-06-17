/**
 * Dashboard (/) — Server Component.
 * Tổng quan số liệu (ý tưởng, post theo trạng thái) + điều hướng nhanh.
 */
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/app/actions/stats";

// Đọc số liệu DB lúc request → luôn hiển thị dữ liệu mới nhất.
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const NAV = [
  { href: "/brand", title: "Brand Profile", desc: "Thiết lập thương hiệu", cta: "Thiết lập →" },
  { href: "/ideas", title: "Ý tưởng & Caption", desc: "Sinh nội dung bằng AI", cta: "Bắt đầu sinh →" },
  { href: "/posts", title: "Nội dung", desc: "Xem mọi caption & bản nháp", cta: "Xem nội dung →" },
  { href: "/calendar", title: "Lịch nội dung", desc: "Xếp lịch đăng theo nền tảng", cta: "Xem lịch →" },
  { href: "/assets", title: "Thư viện ảnh", desc: "Upload ảnh, gắn vào bài", cta: "Mở thư viện →" },
  { href: "/settings", title: "Cài đặt", desc: "Kiểm tra API key", cta: "Mở cài đặt →" },
];

export default async function Home() {
  const stats = await getDashboardStats();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight">Content Creator</h1>
      <p className="mt-2 text-muted-foreground">
        Sinh nội dung + quản lý lịch đăng cho thương hiệu của bạn.
      </p>

      {!stats.hasBrand ? (
        <div className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Bắt đầu bằng cách{" "}
          <Link href="/brand" className="underline">
            thiết lập Brand Profile
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ý tưởng" value={stats.ideas} />
          <Stat label="Nháp" value={stats.draft} />
          <Stat label="Đã lên lịch" value={stats.scheduled} />
          <Stat label="Đã đăng" value={stats.posted} />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="block transition-opacity hover:opacity-80">
            <Card>
              <CardHeader>
                <CardTitle>{n.title}</CardTitle>
                <CardDescription>{n.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{n.cta}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
