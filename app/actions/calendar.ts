"use server";

/**
 * Server actions cho Content Calendar.
 * - listScheduledPosts: post đã có scheduledDate trong 1 tháng (local).
 * - updatePostSchedule: gán/đổi ngày đăng (set status=scheduled khi có ngày).
 * - updatePostStatus: đổi trạng thái draft|scheduled|posted.
 */
import { revalidatePath } from "next/cache";
import { and, eq, gte, lt, isNotNull, inArray } from "drizzle-orm";
import { db, safeRead } from "@/db";
import { post, asset, type Post } from "@/db/schema";
import { parseJsonArray } from "@/lib/json";
import { monthRange } from "@/lib/date";
import { POST_STATUSES, type CalendarPost, type CalendarActionState, type PostStatus } from "@/lib/post-status";

/** Post có scheduledDate trong tháng (year, monthIndex0 = 0-11), kèm thumbnail ảnh đầu. */
export async function listScheduledPosts(year: number, monthIndex0: number): Promise<CalendarPost[]> {
  return safeRead(async () => {
    const { start, end } = monthRange(year, monthIndex0);
    const rows = await db
      .select()
      .from(post)
      .where(and(isNotNull(post.scheduledDate), gte(post.scheduledDate, start), lt(post.scheduledDate, end)));

    // Gom ảnh đầu tiên của mỗi post để hiện thumbnail (một query inArray).
    const firstIds = rows
      .map((r) => parseJsonArray<number>(r.assetIds)[0])
      .filter((x): x is number => typeof x === "number");
    const pathById = new Map<number, string>();
    if (firstIds.length) {
      const assets = await db.select({ id: asset.id, path: asset.path }).from(asset).where(inArray(asset.id, firstIds));
      for (const a of assets) pathById.set(a.id, a.path);
    }

    return rows.map((row: Post) => {
      const firstAssetId = parseJsonArray<number>(row.assetIds)[0];
      return {
        ...row,
        hashtags: parseJsonArray<string>(row.hashtags),
        thumbnailPath: typeof firstAssetId === "number" ? pathById.get(firstAssetId) ?? null : null,
      };
    });
  }, []);
}

/** Gán/đổi ngày đăng. date=null để bỏ lịch (về draft). */
export async function updatePostSchedule(postId: number, date: Date | null): Promise<CalendarActionState> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }
  try {
    await db
      .update(post)
      .set({
        scheduledDate: date,
        status: date ? "scheduled" : "draft",
      })
      .where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Đổi lịch thất bại." };
  }
  revalidatePath("/calendar");
  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã cập nhật lịch." };
}

/** Đổi trạng thái post. */
export async function updatePostStatus(postId: number, status: PostStatus): Promise<CalendarActionState> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { success: false, message: "Post không hợp lệ." };
  }
  if (!POST_STATUSES.includes(status)) {
    return { success: false, message: "Trạng thái không hợp lệ." };
  }
  try {
    await db.update(post).set({ status }).where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Đổi trạng thái thất bại." };
  }
  revalidatePath("/calendar");
  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã đổi trạng thái." };
}
