"use server";

/**
 * Server actions cho Content Calendar.
 * - listScheduledPosts: post đã có scheduledDate trong 1 tháng (local).
 * - updatePostSchedule: gán/đổi ngày đăng (set status=scheduled khi có ngày).
 * - updatePostStatus: đổi trạng thái draft|scheduled|posted.
 */
import { revalidatePath } from "next/cache";
import { and, eq, gte, lt, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { post, type Post } from "@/db/schema";
import { parseJsonArray } from "@/lib/json";
import { monthRange } from "@/lib/date";
import { POST_STATUSES, type CalendarPost, type CalendarActionState, type PostStatus } from "@/lib/post-status";

function toCalendarPost(row: Post): CalendarPost {
  return { ...row, hashtags: parseJsonArray<string>(row.hashtags) };
}

/** Post có scheduledDate trong tháng (year, monthIndex0 = 0-11). */
export async function listScheduledPosts(year: number, monthIndex0: number): Promise<CalendarPost[]> {
  const { start, end } = monthRange(year, monthIndex0);
  const rows = await db
    .select()
    .from(post)
    .where(and(isNotNull(post.scheduledDate), gte(post.scheduledDate, start), lt(post.scheduledDate, end)));
  return rows.map(toCalendarPost);
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
