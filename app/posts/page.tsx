/**
 * Trang Nội dung (/posts) — Server Component.
 * Card nội dung gom theo ý tưởng (1 chủ đề nhiều nền tảng → 1 card, mỗi nền tảng
 * 1 chip mở editor riêng), lọc theo trạng thái + nền tảng, phân trang ?page=N.
 * Phân trang theo post — chủ đề có bài nằm ở 2 trang sẽ hiện ở cả 2 (chấp nhận
 * cho bản local, tránh query gom nhóm phức tạp).
 */
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, FileText, Lightbulb } from "lucide-react";
import { listAllPosts, deletePost, type PostListItem } from "@/app/actions/post";
import { POST_STATUSES, type PostStatus } from "@/lib/post-status";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { DeleteButton } from "@/components/shell/delete-button";
import { PaginationBar } from "@/components/shell/pagination-bar";

export const metadata = { title: "Nội dung" };

// Đọc post từ DB lúc request.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  posted: "Đã đăng",
};
/** Chấm màu trạng thái trên chip từng bài. */
const STATUS_DOT: Record<PostStatus, string> = {
  draft: "bg-neutral-400",
  scheduled: "bg-amber-500",
  posted: "bg-emerald-500",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  tiktok: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
  blog: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

type Search = { status?: string; platform?: string; page?: string };

/**
 * Nhóm các bài cùng ý tưởng thành 1 item gọn.
 * Bài không có ideaId đứng riêng (mỗi bài là 1 nhóm độc lập).
 */
type PostGroup = { key: string; ideaId: number | null; ideaTitle: string | null; posts: PostListItem[] };

function groupByIdea(posts: PostListItem[]): PostGroup[] {
  const groups: PostGroup[] = [];
  const byIdea = new Map<number, PostGroup>();
  // posts đã desc theo id → nhóm xuất hiện theo thứ tự bài mới nhất.
  for (const p of posts) {
    if (p.ideaId == null) {
      groups.push({ key: `post-${p.id}`, ideaId: null, ideaTitle: null, posts: [p] });
      continue;
    }
    let g = byIdea.get(p.ideaId);
    if (!g) {
      g = { key: `idea-${p.ideaId}`, ideaId: p.ideaId, ideaTitle: p.ideaTitle, posts: [] };
      byIdea.set(p.ideaId, g);
      groups.push(g);
    }
    g.posts.push(p);
  }
  return groups;
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = POST_STATUSES.includes(sp.status as PostStatus) ? (sp.status as PostStatus) : undefined;
  const platform = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : undefined;
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const { items: posts, total } = await listAllPosts({
    status,
    platform,
    limit: PAGE_SIZE,
    offset: (pageNum - 1) * PAGE_SIZE,
  });
  const groups = groupByIdea(posts);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Href giữ nguyên filter; đổi filter thì bỏ ?page= (về trang 1).
  const href = (next: Partial<Search>) => {
    const q = new URLSearchParams();
    const s = "status" in next ? next.status : status;
    const p = "platform" in next ? next.platform : platform;
    if (s) q.set("status", s);
    if (p) q.set("platform", p);
    if (next.page && Number(next.page) > 1) q.set("page", next.page);
    const qs = q.toString();
    return `/posts${qs ? `?${qs}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 transition-colors ${
      active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
            <FileText className="size-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nội dung</h1>
        </div>
        <Link
          href="/ideas"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Về trang ý tưởng <ArrowRight className="size-4" />
        </Link>
      </div>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Nội dung đã tạo, gom theo chủ đề — mỗi nền tảng một bài, bấm chip để mở trình soạn.
      </p>

      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <Link href={href({ status: undefined })} className={chip(!status)}>
          Mọi trạng thái
        </Link>
        {POST_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} className={chip(status === s)}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link href={href({ platform: undefined })} className={chip(!platform)}>
          Mọi nền tảng
        </Link>
        {PLATFORMS.map((p) => (
          <Link key={p} href={href({ platform: p })} className={chip(platform === p)}>
            {PLATFORM_LABELS[p]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <FileText className="size-6" />
          </span>
          <p className="text-sm font-medium">Chưa có nội dung nào</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href="/ideas" className="underline">
              Tạo từ ý tưởng
            </Link>{" "}
            — chọn nền tảng rồi sinh caption hoặc tạo nháp trống.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => {
            // Bài đại diện = bài mới nhất (đầu nhóm) → caption + ảnh hiển thị.
            const lead = g.posts[0];
            return (
              <li
                key={g.key}
                className="relative flex flex-col rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Mở ý tưởng gốc + xóa bài đại diện. */}
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                  {g.ideaId != null && (
                    <Link
                      href={`/ideas?idea=${g.ideaId}`}
                      title="Mở ý tưởng gốc"
                      aria-label="Mở ý tưởng gốc"
                      className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <Lightbulb className="size-4" />
                    </Link>
                  )}
                  <DeleteButton
                    action={async () => {
                      "use server";
                      return deletePost(lead.id);
                    }}
                    title="Xóa caption này?"
                    description="Caption sẽ bị xóa vĩnh viễn. Ảnh trong thư viện không bị ảnh hưởng."
                  />
                </div>

                <div className="flex gap-3 pr-16">
                  {lead.thumbnailPath ? (
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={lead.thumbnailPath}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted text-[10px] text-muted-foreground">
                      Không ảnh
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/editor/${lead.id}`}
                      className="line-clamp-2 text-sm font-semibold hover:underline"
                    >
                      {g.ideaTitle ?? "(nội dung tự do)"}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {lead.caption || "(chưa có caption)"}
                    </p>
                  </div>
                </div>

                {/* Mỗi nền tảng 1 chip → mở editor bài tương ứng. */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.posts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/editor/${p.id}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 ${PLATFORM_COLOR[p.platform ?? ""] ?? "bg-muted"}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${STATUS_DOT[p.status as PostStatus] ?? "bg-neutral-400"}`}
                      />
                      {PLATFORM_LABELS[p.platform as Platform] ?? p.platform ?? "Bài"}
                      <span className="opacity-70">· {STATUS_LABEL[p.status as PostStatus] ?? p.status}</span>
                      <ArrowUpRight className="size-3 opacity-60" />
                    </Link>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PaginationBar
        page={pageNum}
        totalPages={totalPages}
        hrefFor={(p) => href({ page: String(p) })}
      />
    </div>
  );
}
