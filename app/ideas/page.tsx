/**
 * Trang Ý tưởng (/ideas) — Server Component.
 * Sinh ý tưởng theo pillar/nền tảng, lọc + tìm kiếm, liệt kê ý tưởng (infinite scroll).
 */
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { getBrand } from "@/app/actions/brand";
import { listIdeas, getIdeaView } from "@/app/actions/post";
import { hasApiKey } from "@/lib/ai/claude-client";
import { IdeasGenerator } from "./ideas-generator";
import { ManualIdeaForm } from "./manual-idea-form";
import { IdeasFilterBar } from "./ideas-filter-bar";
import { IdeasList } from "./ideas-list";
import { PaginationBar } from "@/components/shell/pagination-bar";

const PAGE_SIZE = 18; // khớp IDEA_PAGE_SIZE server; chia hết cho lưới 2 & 3 cột

export const metadata = { title: "Ý tưởng & Caption" };

// Đọc brand + ý tưởng từ DB lúc request.
export const dynamic = "force-dynamic";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    pillar?: string;
    q?: string;
    idea?: string;
    page?: string;
  }>;
}) {
  const { tag, pillar, q, idea: ideaParam, page: pageParam } = await searchParams;
  const brand = await getBrand();
  const keyAvailable = hasApiKey();
  const availableTags = brand?.tags ?? [];

  // Chỉ nhận tag/pillar nằm trong danh sách hợp lệ của brand (chống giá trị rác từ URL).
  const tagFilter = tag && availableTags.includes(tag) ? tag : undefined;
  const pillarFilter = pillar && brand?.pillars.includes(pillar) ? pillar : undefined;
  const searchFilter = q?.trim() || undefined;
  const filter = { tag: tagFilter, pillar: pillarFilter, search: searchFilter };

  // Phân trang ?page=N (SSR) — trang không hợp lệ quy về 1.
  const pageNum = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items: pageItems, total } = brand
    ? await listIdeas({ ...filter, limit: PAGE_SIZE, offset: (pageNum - 1) * PAGE_SIZE })
    : { items: [], total: 0 };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Deep-link ?idea=<id> (link back từ trang nội dung/editor): tự mở panel
  // ý tưởng đó; nếu không nằm trong trang hiện tại thì ghim lên đầu danh sách.
  const openIdeaId = Number(ideaParam);
  const openIdea =
    brand && Number.isInteger(openIdeaId) && openIdeaId > 0 ? await getIdeaView(openIdeaId) : null;
  const items =
    openIdea && !pageItems.some((it) => it.id === openIdea.id)
      ? [openIdea, ...pageItems]
      : pageItems;

  // URL trang giữ nguyên bộ lọc hiện tại; trang 1 không cần param cho gọn.
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (searchFilter) params.set("q", searchFilter);
    if (pillarFilter) params.set("pillar", pillarFilter);
    if (tagFilter) params.set("tag", tagFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/ideas?${qs}` : "/ideas";
  };

  const hasActiveFilter = Boolean(tagFilter || pillarFilter || searchFilter);
  const emptyHint = hasActiveFilter
    ? "Không khớp bộ lọc hiện tại. Thử đổi tag/pillar hoặc xóa từ khóa tìm kiếm."
    : "Nhập tiêu đề vào ô “Thêm ý tưởng nhanh” ở trên, hoặc mở “Sinh ý tưởng bằng AI”.";

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
          {/* Khu tạo ý tưởng: quick-add 1 dòng + card AI gập/mở — gọn để danh
              sách ý tưởng (nội dung chính) hiện ngay trên fold. */}
          <div className="space-y-3">
            <ManualIdeaForm pillars={brand.pillars} />
            <IdeasGenerator pillars={brand.pillars} hasApiKey={keyAvailable} />
          </div>

          <div className="mt-8 mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Ý tưởng</h2>
          </div>

          <IdeasFilterBar pillars={brand.pillars} tags={availableTags} />

          <IdeasList
            items={items}
            openIdeaId={openIdea?.id}
            availableTags={availableTags}
            hasApiKey={keyAvailable}
            emptyHint={emptyHint}
          />
          <PaginationBar page={pageNum} totalPages={totalPages} hrefFor={hrefFor} />
        </>
      )}
    </div>
  );
}
