/**
 * Trang Content Calendar (/calendar) — Server Component.
 * View lịch tháng từ post.scheduledDate; điều hướng tháng + lọc theo nền tảng qua searchParams.
 */
import Link from "next/link";
import { listScheduledPosts } from "@/app/actions/calendar";
import { MONTH_LABEL } from "@/lib/date";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { MonthGrid } from "@/components/calendar/month-grid";

export const metadata = { title: "Lịch nội dung" };

type Search = { y?: string; m?: string; platform?: string };

function clampMonth(y: number, m: number): { year: number; monthIndex0: number } {
  // m là 1-12 trong URL; chuyển sang 0-11 và chuẩn hóa tràn.
  const base = new Date(y, m - 1, 1);
  return { year: base.getFullYear(), monthIndex0: base.getMonth() };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const now = new Date();
  // Chỉ nhận số nguyên dương; "" / rác → mặc định tháng hiện tại (tránh Number("")===0).
  const isPosInt = (v?: string) => !!v && /^\d+$/.test(v) && Number(v) > 0;
  const { year, monthIndex0 } = clampMonth(
    isPosInt(sp.y) ? Number(sp.y) : now.getFullYear(),
    isPosInt(sp.m) ? Number(sp.m) : now.getMonth() + 1,
  );

  const platformFilter = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : null;

  const all = await listScheduledPosts(year, monthIndex0);
  const posts = platformFilter ? all.filter((p) => p.platform === platformFilter) : all;

  const prev = new Date(year, monthIndex0 - 1, 1);
  const next = new Date(year, monthIndex0 + 1, 1);
  const pf = platformFilter ? `&platform=${platformFilter}` : "";
  const navHref = (d: Date) => `/calendar?y=${d.getFullYear()}&m=${d.getMonth() + 1}${pf}`;
  const filterHref = (p: Platform | null) =>
    `/calendar?y=${year}&m=${monthIndex0 + 1}${p ? `&platform=${p}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Lịch nội dung</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={navHref(prev)} className="rounded border px-2 py-1 hover:bg-muted">
            ←
          </Link>
          <span className="min-w-28 text-center font-medium">{MONTH_LABEL(year, monthIndex0)}</span>
          <Link href={navHref(next)} className="rounded border px-2 py-1 hover:bg-muted">
            →
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <Link
          href={filterHref(null)}
          className={`rounded-lg border px-2.5 py-1 ${!platformFilter ? "bg-muted font-medium" : "hover:bg-muted"}`}
        >
          Tất cả
        </Link>
        {PLATFORMS.map((p) => (
          <Link
            key={p}
            href={filterHref(p)}
            className={`rounded-lg border px-2.5 py-1 ${platformFilter === p ? "bg-muted font-medium" : "hover:bg-muted"}`}
          >
            {PLATFORM_LABELS[p]}
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Chưa có post nào được lên lịch trong tháng này. Gán ngày đăng trong trình soạn caption.
        </p>
      )}

      <MonthGrid year={year} monthIndex0={monthIndex0} posts={posts} />
    </div>
  );
}
