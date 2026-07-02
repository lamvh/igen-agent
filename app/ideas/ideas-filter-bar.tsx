"use client";

/**
 * IdeasFilterBar — ô tìm kiếm theo tiêu đề + chọn pillar + chips tag.
 * Đẩy bộ lọc lên URL searchParams (q/pillar/tag) để page.tsx (Server Component)
 * load lại trang đầu theo filter. Search debounce để tránh spam điều hướng.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function IdeasFilterBar({
  pillars,
  tags,
}: {
  pillars: string[];
  tags: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activePillar = searchParams.get("pillar") ?? "";
  const activeTag = searchParams.get("tag") ?? "";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  // Build URL mới giữ nguyên các param khác; bỏ param khi giá trị rỗng.
  // Đổi bộ lọc luôn quay về trang 1 (bỏ ?page=) để không rơi vào trang rỗng.
  const pushParams = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce search → cập nhật ?q= sau 350ms ngừng gõ.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const id = setTimeout(() => pushParams({ q: search.trim() }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề ý tưởng…"
            className="h-9 pl-8"
            aria-label="Tìm kiếm ý tưởng"
          />
        </div>
        {pillars.length > 0 && (
          <select
            aria-label="Lọc theo pillar"
            value={activePillar}
            onChange={(e) => pushParams({ pillar: e.target.value })}
            className={`${selectClass} ${activePillar ? "" : "text-muted-foreground"}`}
          >
            <option value="">Tất cả pillar</option>
            {pillars.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Chips lọc theo tag — giữ q/pillar hiện tại khi đổi tag. */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => pushParams({ tag: "" })}
            className={`rounded-full border px-2.5 py-1 ${
              !activeTag ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            Tất cả
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pushParams({ tag: activeTag === t ? "" : t })}
              className={`rounded-full border px-2.5 py-1 ${
                activeTag === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
