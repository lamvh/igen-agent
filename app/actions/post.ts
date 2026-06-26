"use server";

/**
 * Server actions cho idea/post (đọc + lưu thủ công).
 * - listIdeas: ý tưởng của brand (mới nhất trước).
 * - getPost / getSiblingPosts: dữ liệu cho caption editor.
 * - saveCaption: lưu chỉnh sửa caption + hashtags thủ công (cũng dùng khi thiếu API key).
 */
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { asset, idea, post, type Idea, type Post } from "@/db/schema";
import { getBrand } from "@/app/actions/brand";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";
import type { PostStatus } from "@/lib/post-status";
import type { Platform } from "@/lib/ai/prompts";

export type PostView = Omit<Post, "hashtags"> & { hashtags: string[]; ideaTitle: string | null };

/** Item cho danh sách tất cả post (/posts): kèm tiêu đề ý tưởng + thumbnail ảnh đầu. */
export type PostListItem = Omit<Post, "hashtags"> & {
  hashtags: string[];
  ideaTitle: string | null;
  thumbnailPath: string | null;
};

export type SaveCaptionState = { success: boolean; message: string };

/** Ý tưởng kèm tags đã parse (JSON text → string[]) cho client. */
export type IdeaView = Omit<Idea, "tags"> & { tags: string[] };

/** Ý tưởng của brand hiện tại (mới nhất trước). [] nếu chưa có brand. */
export async function listIdeas(): Promise<IdeaView[]> {
  const brand = await getBrand();
  if (!brand) return [];
  const rows = await db
    .select()
    .from(idea)
    .where(eq(idea.brandId, brand.id))
    .orderBy(desc(idea.id));
  return rows.map((r) => ({ ...r, tags: parseJsonArray<string>(r.tags) }));
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

/** Tất cả post (full view) của 1 ý tưởng — cho editor 3 tab. Hashtags đã parse. */
export async function getIdeaPosts(ideaId: number): Promise<PostView[]> {
  const rows = await db.select().from(post).where(eq(post.ideaId, ideaId)).orderBy(asc(post.id));
  // Mọi post cùng ý tưởng nên ideaTitle giống nhau — lấy 1 lần.
  let ideaTitle: string | null = null;
  if (rows[0]) {
    const ir = await db.select({ title: idea.title }).from(idea).where(eq(idea.id, ideaId)).limit(1);
    ideaTitle = ir[0]?.title ?? null;
  }
  return rows.map((r) => toView(r, ideaTitle));
}

/**
 * Tất cả post (mới nhất trước), lọc tùy chọn theo status + platform.
 * Kèm tiêu đề ý tưởng + thumbnail (ảnh đầu) để hiện trong danh sách /posts.
 * Phạm vi toàn DB (v1 chỉ 1 brand) — nếu sau này nhiều brand cần lọc theo brandId.
 */
export async function listAllPosts(filters?: {
  status?: PostStatus;
  platform?: Platform;
}): Promise<PostListItem[]> {
  const conds = [];
  if (filters?.status) conds.push(eq(post.status, filters.status));
  if (filters?.platform) conds.push(eq(post.platform, filters.platform));

  const rows = await db
    .select()
    .from(post)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(post.id));

  // Gom tiêu đề ý tưởng + ảnh đầu bằng 2 query inArray (tránh N+1).
  const ideaIds = [...new Set(rows.map((r) => r.ideaId).filter((x): x is number => x != null))];
  const firstAssetIds = rows
    .map((r) => parseJsonArray<number>(r.assetIds)[0])
    .filter((x): x is number => typeof x === "number");

  const [ideaRows, assetRows] = await Promise.all([
    ideaIds.length
      ? db.select({ id: idea.id, title: idea.title }).from(idea).where(inArray(idea.id, ideaIds))
      : Promise.resolve([]),
    firstAssetIds.length
      ? db.select({ id: asset.id, path: asset.path }).from(asset).where(inArray(asset.id, firstAssetIds))
      : Promise.resolve([]),
  ]);
  const titleById = new Map(ideaRows.map((r) => [r.id, r.title]));
  const pathById = new Map(assetRows.map((r) => [r.id, r.path]));

  return rows.map((row) => {
    const firstAssetId = parseJsonArray<number>(row.assetIds)[0];
    return {
      ...row,
      hashtags: parseJsonArray<string>(row.hashtags),
      ideaTitle: row.ideaId != null ? titleById.get(row.ideaId) ?? null : null,
      thumbnailPath: typeof firstAssetId === "number" ? pathById.get(firstAssetId) ?? null : null,
    };
  });
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

export type DeleteState = { success: boolean; message: string };

/** Gán danh sách tag cho 1 ý tưởng (thay thế toàn bộ tags hiện có). */
export async function updateIdeaTags(ideaId: number, tags: string[]): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  const clean = tags.map((t) => t.trim()).filter(Boolean);
  try {
    await db.update(idea).set({ tags: serializeJsonArray(clean) }).where(eq(idea.id, ideaId));
  } catch {
    return { success: false, message: "Cập nhật tag thất bại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã cập nhật tag." };
}

/**
 * Xóa 1 ý tưởng. Các post sinh từ ý tưởng này được GIỮ LẠI — chỉ gỡ liên kết
 * (post.ideaId = null) để không phá ràng buộc khóa ngoại và không mất nội dung.
 */
export async function deleteIdea(ideaId: number): Promise<DeleteState> {
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return { success: false, message: "Ý tưởng không hợp lệ." };
  }
  try {
    db.transaction((tx) => {
      tx.update(post).set({ ideaId: null }).where(eq(post.ideaId, ideaId)).run();
      tx.delete(idea).where(eq(idea.id, ideaId)).run();
    });
  } catch {
    return { success: false, message: "Xóa ý tưởng thất bại, vui lòng thử lại." };
  }
  revalidatePath("/ideas");
  return { success: true, message: "Đã xóa ý tưởng." };
}

/** Xóa 1 post (caption). Không xóa ảnh đính kèm (ảnh dùng chung trong thư viện). */
export async function deletePost(postId: number): Promise<DeleteState> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }
  try {
    await db.delete(post).where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Xóa post thất bại, vui lòng thử lại." };
  }
  revalidatePath("/posts");
  revalidatePath("/calendar");
  return { success: true, message: "Đã xóa post." };
}
