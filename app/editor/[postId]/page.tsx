/**
 * Trang Caption Editor (/editor/[postId]) — Server Component.
 * Hiển thị 1 post draft + cho chuyển nhanh sang các nền tảng cùng ý tưởng.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getSiblingPosts } from "@/app/actions/post";
import { listAssets } from "@/app/actions/asset";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { toDateInputValue } from "@/lib/date";
import { parseJsonArray } from "@/lib/json";
import { CaptionEditor } from "./caption-editor";
import { ScheduleControl } from "./schedule-control";
import { AssetPicker } from "./asset-picker";

export const metadata = { title: "Soạn caption" };

export default async function EditorPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  const [siblings, assets] = await Promise.all([
    post.ideaId ? getSiblingPosts(post.ideaId) : Promise.resolve([]),
    listAssets(),
  ]);
  const attachedIds = parseJsonArray<number>(post.assetIds);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/ideas" className="text-sm text-muted-foreground underline">
        ← Về danh sách ý tưởng
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        Caption · {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
      </h1>
      {post.ideaTitle && (
        <p className="mt-1 text-sm text-muted-foreground">Ý tưởng: {post.ideaTitle}</p>
      )}

      {siblings.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/editor/${s.id}`}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                s.id === post.id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {PLATFORM_LABELS[s.platform as Platform] ?? s.platform}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-6">
        <CaptionEditor post={post} />
        <ScheduleControl
          postId={post.id}
          initialDate={toDateInputValue(post.scheduledDate ? new Date(post.scheduledDate) : null)}
        />
        <AssetPicker postId={post.id} assets={assets} attachedIds={attachedIds} />
      </div>
    </div>
  );
}
