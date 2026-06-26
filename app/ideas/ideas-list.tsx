"use client";

/**
 * IdeasList — lưới ý tưởng với infinite scroll.
 * Nhận trang đầu (SSR) + bộ lọc hiện tại; khi sentinel vào viewport thì gọi
 * server action listIdeas() lấy thêm 20 ý tưởng và nối vào danh sách.
 * Reset khi filter đổi nhờ key ở component cha (page.tsx).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { listIdeas, type IdeaFilter, type IdeaView } from "@/app/actions/post";
import { IdeaCard } from "./idea-card";

const PAGE_SIZE = 20;

export function IdeasList({
  initialItems,
  initialHasMore,
  filter,
  availableTags,
  hasApiKey,
  emptyHint,
}: {
  initialItems: IdeaView[];
  initialHasMore: boolean;
  /** Bộ lọc đang áp dụng (không gồm limit/offset — component tự quản phân trang). */
  filter: Omit<IdeaFilter, "limit" | "offset">;
  availableTags: string[];
  hasApiKey: boolean;
  emptyHint: string;
}) {
  // Chỉ giữ các trang load thêm trong client state; trang đầu lấy thẳng từ
  // server props (initialItems) nên luôn phản ánh data mới sau revalidate +
  // router.refresh() (vd sau khi sinh content / cập nhật dàn ý).
  const [extraItems, setExtraItems] = useState<IdeaView[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Server data mới đổ về (initialItems đổi reference) → bỏ các trang đã load
  // thêm để tránh trùng/lệch, rồi để IntersectionObserver nạp lại nếu cần.
  useEffect(() => {
    setExtraItems([]);
    setHasMore(initialHasMore);
  }, [initialItems, initialHasMore]);

  // Gộp trang đầu (server) + các trang thêm (client), khử trùng theo id phòng
  // trường hợp data dịch chuyển giữa các lần phân trang.
  const items = useMemo(() => {
    const seen = new Set(initialItems.map((it) => it.id));
    return [...initialItems, ...extraItems.filter((it) => !seen.has(it.id))];
  }, [initialItems, extraItems]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await listIdeas({ ...filter, limit: PAGE_SIZE, offset: items.length });
      setExtraItems((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [filter, hasMore, items.length, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <Lightbulb className="size-6" />
        </span>
        <p className="text-sm font-medium">Không có ý tưởng nào</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.id}>
            <IdeaCard
              idea={{
                id: it.id,
                title: it.title,
                pillar: it.pillar,
                outline: it.outline,
                outlineVersions: it.outlineVersions,
                imagePrompt: it.imagePrompt,
                tags: it.tags,
                posts: it.posts,
              }}
              availableTags={availableTags}
              hasApiKey={hasApiKey}
            />
          </li>
        ))}
      </ul>

      {/* Sentinel + spinner cho infinite scroll. */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading && <Spinner />}
        </div>
      )}
    </>
  );
}
