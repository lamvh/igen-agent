/**
 * Helper ngày tháng cho Content Calendar — dùng giờ LOCAL nhất quán
 * (tránh lệch timezone). Không cần thư viện ngoài cho view tháng tối giản.
 */

/** Khóa ngày local "YYYY-MM-DD" từ Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" (từ <input type="date">) thành Date ở nửa đêm local. */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Giá trị cho <input type="date"> từ Date (hoặc null). */
export function toDateInputValue(d: Date | null | undefined): string {
  return d ? dateKey(d) : "";
}

/** Khoảng [đầu, cuối) của tháng (local) — dùng lọc post theo tháng. */
export function monthRange(year: number, monthIndex0: number): { start: Date; end: Date } {
  return {
    start: new Date(year, monthIndex0, 1),
    end: new Date(year, monthIndex0 + 1, 1),
  };
}

/**
 * Sinh lưới tháng: mảng tuần, mỗi tuần 7 ô.
 * Bắt đầu từ Thứ Hai. Ô ngoài tháng đánh dấu inCurrentMonth=false.
 */
export type CalendarCell = { date: Date; key: string; inCurrentMonth: boolean };

export function monthGridCells(year: number, monthIndex0: number): CalendarCell[][] {
  const first = new Date(year, monthIndex0, 1);
  // getDay(): 0=CN..6=T7 → đổi sang offset bắt đầu Thứ Hai (T2=0..CN=6).
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex0, 1 - offset);

  const weeks: CalendarCell[][] = [];
  const cursor = new Date(gridStart);
  // 6 tuần phủ mọi bố cục tháng.
  for (let w = 0; w < 6; w++) {
    const week: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: new Date(cursor),
        key: dateKey(cursor),
        inCurrentMonth: cursor.getMonth() === monthIndex0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const MONTH_LABEL = (year: number, monthIndex0: number) => `Tháng ${monthIndex0 + 1}/${year}`;
