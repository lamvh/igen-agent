/**
 * Lưới tháng (Server Component) — render post-card vào đúng ngày.
 * Nhận posts đã lọc; nhóm theo ngày local rồi đổ vào ô.
 */
import { dateKey, monthGridCells, WEEKDAY_LABELS } from "@/lib/date";
import type { CalendarPost } from "@/lib/post-status";
import { PostCard } from "./post-card";

function groupByDay(posts: CalendarPost[]): Map<string, CalendarPost[]> {
  const map = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    if (!p.scheduledDate) continue;
    const key = dateKey(new Date(p.scheduledDate));
    const bucket = map.get(key) ?? [];
    bucket.push(p);
    map.set(key, bucket);
  }
  return map;
}

export function MonthGrid({
  year,
  monthIndex0,
  posts,
}: {
  year: number;
  monthIndex0: number;
  posts: CalendarPost[];
}) {
  const weeks = monthGridCells(year, monthIndex0);
  const byDay = groupByDay(posts);
  const todayKey = dateKey(new Date());

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const dayPosts = byDay.get(cell.key) ?? [];
          return (
            <div
              key={cell.key}
              className={`min-h-24 border-b border-r p-1 ${
                cell.inCurrentMonth ? "" : "bg-muted/30 text-muted-foreground"
              }`}
            >
              <div
                className={`mb-1 text-right text-xs ${
                  cell.key === todayKey ? "font-bold text-primary" : ""
                }`}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-1">
                {dayPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
