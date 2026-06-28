"use server";

/**
 * Số liệu tổng quan cho dashboard.
 * Đếm ý tưởng + post theo trạng thái (toàn DB — v1 chỉ 1 brand).
 */
import { count, eq } from "drizzle-orm";
import { db, safeRead } from "@/db";
import { brand, idea, post } from "@/db/schema";

export type DashboardStats = {
  hasBrand: boolean;
  ideas: number;
  postsTotal: number;
  draft: number;
  scheduled: number;
  posted: number;
};

async function countWhere(status: string): Promise<number> {
  const r = await db.select({ c: count() }).from(post).where(eq(post.status, status));
  return r[0]?.c ?? 0;
}

const EMPTY_STATS: DashboardStats = {
  hasBrand: false,
  ideas: 0,
  postsTotal: 0,
  draft: 0,
  scheduled: 0,
  posted: 0,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  return safeRead(async () => {
    const [brandRows, ideaRows, postRows, draft, scheduled, posted] = await Promise.all([
      db.select({ c: count() }).from(brand),
      db.select({ c: count() }).from(idea),
      db.select({ c: count() }).from(post),
      countWhere("draft"),
      countWhere("scheduled"),
      countWhere("posted"),
    ]);

    return {
      hasBrand: (brandRows[0]?.c ?? 0) > 0,
      ideas: ideaRows[0]?.c ?? 0,
      postsTotal: postRows[0]?.c ?? 0,
      draft,
      scheduled,
      posted,
    };
  }, EMPTY_STATS);
}
