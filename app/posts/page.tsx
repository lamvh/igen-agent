/**
 * Trang Nội dung (/posts) — Server Component.
 * Danh sách tất cả post (nháp/đã lên lịch/đã đăng), mới nhất trước,
 * lọc theo trạng thái + nền tảng. Click để mở trình soạn.
 */
import Link from "next/link";
import Image from "next/image";
import { listAllPosts } from "@/app/actions/post";
import { POST_STATUSES, type PostStatus } from "@/lib/post-status";
import { PLATFORMS, PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { dateKey } from "@/lib/date";

export const metadata = { title: "Nội dung" };

// Đọc post từ DB lúc request.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  posted: "Đã đăng",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  scheduled: "bg-sky-100 text-sky-700",
  posted: "bg-green-100 text-green-700",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  tiktok: "bg-neutral-200 text-neutral-800",
};

type Search = { status?: string; platform?: string };

export default async function PostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const status = POST_STATUSES.includes(sp.status as PostStatus) ? (sp.status as PostStatus) : undefined;
  const platform = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : undefined;

  const posts = await listAllPosts({ status, platform });

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
        Tất cả caption đã tạo (gồm bản nháp). Click để mở trình soạn.
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
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/editor/${p.id}`}
                className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {p.thumbnailPath ? (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded">
                    <Image src={p.thumbnailPath} alt="" fill sizes="56px" className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded bg-muted text-[10px] text-muted-foreground">
                    Không ảnh
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    <span className={`rounded px-1 py-0.5 ${PLATFORM_COLOR[p.platform] ?? "bg-muted"}`}>
                      {PLATFORM_LABELS[p.platform as Platform] ?? p.platform}
                    </span>
                    <span className={`rounded px-1 py-0.5 ${STATUS_COLOR[p.status] ?? "bg-muted"}`}>
                      {STATUS_LABEL[p.status as PostStatus] ?? p.status}
                    </span>
                    {p.scheduledDate && (
                      <span className="text-muted-foreground">
                        · {dateKey(new Date(p.scheduledDate))}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{p.caption || "(chưa có caption)"}</p>
                  {p.ideaTitle && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">Ý tưởng: {p.ideaTitle}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
