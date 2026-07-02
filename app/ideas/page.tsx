/**
 * Trang Ý tưởng (/ideas) — Server Component.
 * Sinh ý tưởng theo pillar/nền tảng, lọc + tìm kiếm, liệt kê ý tưởng (infinite scroll).
 */
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { getBrand } from "@/app/actions/brand";
import { listIdeas } from "@/app/actions/post";
import { hasApiKey } from "@/lib/ai/claude-client";
import { IdeasGenerator } from "./ideas-generator";
import { ManualIdeaForm } from "./manual-idea-form";
import { IdeasFilterBar } from "./ideas-filter-bar";
import { IdeasList } from "./ideas-list";

export const metadata = { title: "Ý tưởng & Caption" };

// Đọc brand + ý tưởng từ DB lúc request.
export const dynamic = "force-dynamic";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; pillar?: string; q?: string }>;
}) {
  const { tag, pillar, q } = await searchParams;
  const brand = await getBrand();
  const keyAvailable = hasApiKey();
  const availableTags = brand?.tags ?? [];

  // Chỉ nhận tag/pillar nằm trong danh sách hợp lệ của brand (chống giá trị rác từ URL).
  const tagFilter = tag && availableTags.includes(tag) ? tag : undefined;
  const pillarFilter = pillar && brand?.pillars.includes(pillar) ? pillar : undefined;
  const searchFilter = q?.trim() || undefined;
  const filter = { tag: tagFilter, pillar: pillarFilter, search: searchFilter };

  // Trang đầu (SSR); các trang sau tải qua infinite scroll trong IdeasList.
  const firstPage = brand ? await listIdeas(filter) : { items: [], hasMore: false };

  const hasActiveFilter = Boolean(tagFilter || pillarFilter || searchFilter);
  const emptyHint = hasActiveFilter
    ? "Không khớp bộ lọc hiện tại. Thử đổi tag/pillar hoặc xóa từ khóa tìm kiếm."
    : "Chọn pillar ở trên rồi bấm “Sinh ý tưởng” để bắt đầu.";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
            <Lightbulb className="size-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Ý tưởng &amp; Caption</h1>
        </div>
        <Link
          href="/posts"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Xem nội dung đã tạo <ArrowRight className="size-4" />
        </Link>
      </div>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Sinh ý tưởng nội dung rồi tạo caption riêng cho từng nền tảng.
      </p>

      {!brand ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Bạn cần{" "}
          <Link href="/settings?tab=brand" className="underline">
            thiết lập Brand Profile
          </Link>{" "}
          trước khi sinh nội dung.
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ManualIdeaForm pillars={brand.pillars} />
            <IdeasGenerator pillars={brand.pillars} hasApiKey={keyAvailable} />
          </div>

          <div className="mt-10 mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Ý tưởng</h2>
          </div>

          <IdeasFilterBar pillars={brand.pillars} tags={availableTags} />

          {/* key reset state infinite scroll khi bộ lọc đổi. */}
          <IdeasList
            key={`${tagFilter ?? ""}|${pillarFilter ?? ""}|${searchFilter ?? ""}`}
            initialItems={firstPage.items}
            initialHasMore={firstPage.hasMore}
            filter={filter}
            availableTags={availableTags}
            hasApiKey={keyAvailable}
            emptyHint={emptyHint}
          />
        </>
      )}
    </div>
  );
}
