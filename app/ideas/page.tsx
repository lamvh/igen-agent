/**
 * Trang Ý tưởng (/ideas) — Server Component.
 * Sinh ý tưởng theo pillar/nền tảng, liệt kê ý tưởng, tạo caption từ ý tưởng.
 */
import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { getBrand } from "@/app/actions/brand";
import { listIdeas } from "@/app/actions/post";
import { hasApiKey } from "@/lib/ai/claude-client";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { IdeasGenerator } from "./ideas-generator";
import { IdeaActions } from "./idea-actions";

// Badge màu cho từng nền tảng (đồng bộ với trang /posts).
const PLATFORM_BADGE: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  tiktok: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

export const metadata = { title: "Ý tưởng & Caption" };

// Đọc brand + ý tưởng từ DB lúc request.
export const dynamic = "force-dynamic";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag: activeTag } = await searchParams;
  const [brand, allIdeas] = await Promise.all([getBrand(), listIdeas()]);
  const keyAvailable = hasApiKey();

  const availableTags = brand?.tags ?? [];
  // Lọc theo tag nếu searchParams.tag hợp lệ (nằm trong danh sách brand.tags).
  const tagFilter = activeTag && availableTags.includes(activeTag) ? activeTag : undefined;
  const ideas = tagFilter ? allIdeas.filter((it) => it.tags.includes(tagFilter)) : allIdeas;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
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
          <Link href="/brand" className="underline">
            thiết lập Brand Profile
          </Link>{" "}
          trước khi sinh nội dung.
        </div>
      ) : (
        <>
          <IdeasGenerator pillars={brand.pillars} hasApiKey={keyAvailable} />

          <div className="mt-10 mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Ý tưởng</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {ideas.length}
            </span>
          </div>

          {/* Thanh lọc theo tag (server-side qua searchParams). */}
          {availableTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <Link
                href="/ideas"
                className={`rounded-full border px-2.5 py-1 ${
                  !tagFilter ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                Tất cả
              </Link>
              {availableTags.map((t) => (
                <Link
                  key={t}
                  href={`/ideas?tag=${encodeURIComponent(t)}`}
                  className={`rounded-full border px-2.5 py-1 ${
                    tagFilter === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
          {ideas.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
                <Lightbulb className="size-6" />
              </span>
              <p className="text-sm font-medium">
                {tagFilter ? `Không có ý tưởng nào với tag “${tagFilter}”` : "Chưa có ý tưởng nào"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tagFilter
                  ? "Thử chọn tag khác hoặc xem tất cả."
                  : "Chọn pillar & nền tảng ở trên rồi bấm “Sinh ý tưởng” để bắt đầu."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {ideas.map((it, i) => (
                <li
                  key={it.id}
                  className="space-y-2 rounded-xl border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{it.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          {it.platform && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 font-medium ${PLATFORM_BADGE[it.platform] ?? "bg-muted"}`}
                            >
                              {PLATFORM_LABELS[it.platform as Platform] ?? it.platform}
                            </span>
                          )}
                          {it.pillar && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                              {it.pillar}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <IdeaActions
                      ideaId={it.id}
                      outline={it.outline}
                      imagePrompt={it.imagePrompt}
                      tags={it.tags}
                      availableTags={availableTags}
                      hasApiKey={keyAvailable}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
