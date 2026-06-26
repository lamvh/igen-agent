/**
 * Trang Caption Editor (/editor/[postId]) — Server Component.
 * Hiển thị 1 post draft + cho chuyển nhanh sang các nền tảng cùng ý tưởng.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPost, getIdeaPosts, deletePost, type PostView } from "@/app/actions/post";
import { listAssets } from "@/app/actions/asset";
import { getBrand } from "@/app/actions/brand";
import { hasApiKey } from "@/lib/ai/claude-client";
import { PLATFORM_LABELS, type Platform } from "@/lib/ai/prompts";
import { EditorWorkspace } from "./editor-workspace";
import { DeleteButton } from "@/components/shell/delete-button";

export const metadata = { title: "Soạn caption" };

export default async function EditorPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const id = Number(postId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const post = await getPost(id);
  if (!post) notFound();

  const [ideaPosts, assets, brand] = await Promise.all([
    // Mọi post cùng ý tưởng (cho 3 tab). Post không gắn ý tưởng → chỉ chính nó.
    post.ideaId ? getIdeaPosts(post.ideaId) : Promise.resolve([post] as PostView[]),
    listAssets(),
    getBrand(),
  ]);

  const keyAvailable = hasApiKey();
  const activePlatform = (post.platform as Platform) ?? "facebook";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between gap-2">
        <Link href="/ideas" className="text-sm text-muted-foreground underline">
          ← Về danh sách ý tưởng
        </Link>
        <DeleteButton
          action={async () => {
            "use server";
            const res = await deletePost(id);
            // Xóa xong thì rời trang editor (post không còn).
            if (res.success) redirect("/posts");
            return res;
          }}
          title="Xóa caption này?"
          description="Caption sẽ bị xóa vĩnh viễn và bạn sẽ quay về danh sách nội dung."
          triggerLabel="Xóa post này"
        />
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Soạn nội dung</h1>
      {post.ideaTitle && (
        <p className="mt-1 text-sm text-muted-foreground">Ý tưởng: {post.ideaTitle}</p>
      )}

      <div className="mt-6">
        <EditorWorkspace
          ideaId={post.ideaId ?? 0}
          posts={ideaPosts}
          assets={assets}
          brandName={brand?.name ?? "Thương hiệu"}
          hasApiKey={keyAvailable}
          activePlatform={PLATFORM_LABELS[activePlatform] ? activePlatform : "facebook"}
        />
      </div>
    </div>
  );
}
