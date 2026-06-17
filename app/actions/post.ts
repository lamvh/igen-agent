"use server";

/**
 * Server actions cho idea/post (đọc + lưu thủ công).
 * - listIdeas: ý tưởng của brand (mới nhất trước).
 * - getPost / getSiblingPosts: dữ liệu cho caption editor.
 * - saveCaption: lưu chỉnh sửa caption + hashtags thủ công (cũng dùng khi thiếu API key).
 */
import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { idea, post, type Idea, type Post } from "@/db/schema";
import { getBrand } from "@/app/actions/brand";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";

export type PostView = Omit<Post, "hashtags"> & { hashtags: string[]; ideaTitle: string | null };

export type SaveCaptionState = { success: boolean; message: string };

/** Ý tưởng của brand hiện tại (mới nhất trước). [] nếu chưa có brand. */
export async function listIdeas(): Promise<Idea[]> {
  const brand = await getBrand();
  if (!brand) return [];
  return db.select().from(idea).where(eq(idea.brandId, brand.id)).orderBy(desc(idea.id));
}

function toView(row: Post, ideaTitle: string | null): PostView {
  return { ...row, hashtags: parseJsonArray<string>(row.hashtags), ideaTitle };
}

/** Lấy 1 post + tiêu đề ý tưởng kèm theo; null nếu không tồn tại. */
export async function getPost(postId: number): Promise<PostView | null> {
  const rows = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  const row = rows[0];
  if (!row) return null;

  let ideaTitle: string | null = null;
  if (row.ideaId) {
    const ir = await db.select({ title: idea.title }).from(idea).where(eq(idea.id, row.ideaId)).limit(1);
    ideaTitle = ir[0]?.title ?? null;
  }
  return toView(row, ideaTitle);
}

/** Các post cùng ý tưởng (các nền tảng khác) để chuyển nhanh trong editor. */
export async function getSiblingPosts(ideaId: number): Promise<Pick<Post, "id" | "platform">[]> {
  return db
    .select({ id: post.id, platform: post.platform })
    .from(post)
    .where(eq(post.ideaId, ideaId))
    .orderBy(asc(post.id));
}

/** Lưu chỉnh sửa caption + hashtags. useActionState: (prev, formData) với postId qua hidden field. */
export async function saveCaption(_prev: SaveCaptionState, formData: FormData): Promise<SaveCaptionState> {
  const postId = Number(formData.get("postId"));
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }

  const caption = String(formData.get("caption") ?? "");
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/[\s,]+/)
    .map((h) => h.replace(/^#/, "").trim())
    .filter(Boolean);

  try {
    await db
      .update(post)
      .set({ caption, hashtags: serializeJsonArray(hashtags) })
      .where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Lưu thất bại, vui lòng thử lại." };
  }

  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã lưu caption." };
}
