/**
 * Trang Nội dung (/posts) — Server Component.
 * Danh sách tất cả post (nháp/đã lên lịch/đã đăng), mới nhất trước,
 * lọc theo trạng thái + nền tảng. Các bài cùng một ý tưởng được gom thành 1 nhóm
 * (1 chủ đề có nhiều mạng xã hội → 1 nhóm, mỗi bài vẫn là 1 dòng riêng).
 * Click để mở trình soạn.
 */
import Link from "next/link";
import Image from "next/image";
import { Lightbulb } from "lucide-react";
import { listAllPosts, deletePost, type PostListItem } from "@/app/actions/post";
import { POST_STATUSES, type PostStatus } from "@/lib/post-status";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { DeleteButton } from "@/components/shell/delete-button";

export const metadata = { title: "Nội dung" };

// Đọc post từ DB lúc request.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  posted: "Đã đăng",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-neutral-200 text-neutral-800",
  blog: "bg-amber-100 text-amber-700",
};

type Search = { status?: string; platform?: string };

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

/** Các nền tảng khác nhau trong nhóm, giữ thứ tự xuất hiện. */
function platformsOf(posts: PostListItem[]): string[] {
  return [...new Set(posts.map((p) => p.platform))];
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = POST_STATUSES.includes(sp.status as PostStatus) ? (sp.status as PostStatus) : undefined;
  const platform = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : undefined;

  const posts = await listAllPosts({ status, platform });
  const groups = groupByIdea(posts);

  const chip = (active: boolean) =>
    `rounded-lg border px-2.5 py-1 ${active ? "bg-muted font-medium" : "hover:bg-muted"}`;
  const href = (next: Partial<Search>) => {
    // Phân biệt "không đụng tới filter này" (giữ nguyên) vs "đặt undefined" (xóa filter).
    const q = new URLSearchParams();
    const s = "status" in next ? next.status : status;
    const p = "platform" in next ? next.platform : platform;
    if (s) q.set("status", s);
    if (p) q.set("platform", p);
    const qs = q.toString();
    return `/posts${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <p className="mb-6 text-sm text-muted-foreground">
        Caption đã tạo, gom theo chủ đề. Click để mở trình soạn.
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
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
        <p className="text-sm text-muted-foreground">
          Chưa có nội dung nào.{" "}
          <Link href="/ideas" className="underline">
            Tạo từ ý tưởng
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            // Bài đại diện = bài mới nhất (đầu nhóm) → caption + ảnh hiển thị,
            // và click cả item mở thẳng editor bài này.
            const lead = g.posts[0];
            const platforms = platformsOf(g.posts);
            return (
              <li key={g.key} className="relative">
                {/* Mở ý tưởng gốc + xóa bài đại diện — đặt ngoài Link chính
                    (cả item đã là link vào editor, không lồng link được). */}
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
                <Link
                  href={`/editor/${lead.id}`}
                  className="flex gap-3 rounded-lg border p-3 pr-12 transition-colors hover:bg-muted/50"
                >
                  {lead.thumbnailPath ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded">
                      <Image src={lead.thumbnailPath} alt="" fill sizes="56px" className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded bg-muted text-[10px] text-muted-foreground">
                      Không ảnh
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Tiêu đề chủ đề (nếu có) làm dòng chính của item. */}
                    {g.ideaTitle && (
                      <p className="truncate text-sm font-semibold">{g.ideaTitle}</p>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]">
                      {platforms.map((pl) => (
                        <span key={pl} className={`rounded px-1 py-0.5 ${PLATFORM_COLOR[pl] ?? "bg-muted"}`}>
                          {PLATFORM_LABELS[pl as Platform] ?? pl}
                        </span>
                      ))}
                      <span className="text-muted-foreground">
                        · {g.posts.length} bài
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {lead.caption || "(chưa có caption)"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
