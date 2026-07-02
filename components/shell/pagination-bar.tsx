/**
 * PaginationBar — điều hướng phân trang dùng chung (Server Component).
 * Prev/Next + chỉ số "Trang X/Y"; href do trang cha dựng (giữ nguyên filter).
 * Ẩn hoàn toàn khi chỉ có 1 trang.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  /** Dựng URL cho 1 trang cụ thể (giữ các searchParams khác của trang cha). */
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const btn =
    "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors hover:bg-muted";
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Phân trang" className="mt-6 flex items-center justify-center gap-3">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`${btn} ${page <= 1 ? disabled : ""}`}
      >
        <ChevronLeft className="size-3.5" /> Trước
      </Link>
      <span className="text-xs tabular-nums text-muted-foreground">
        Trang {page}/{totalPages}
      </span>
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`${btn} ${page >= totalPages ? disabled : ""}`}
      >
        Sau <ChevronRight className="size-3.5" />
      </Link>
    </nav>
  );
}
