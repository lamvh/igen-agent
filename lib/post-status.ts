/**
 * Hằng số + kiểu cho trạng thái post và view lịch.
 * Tách khỏi server actions để client component import được (file 'use server'
 * chỉ được export async function).
 */
import type { Post } from "@/db/schema";

export type PostStatus = "draft" | "scheduled" | "posted";
export const POST_STATUSES: PostStatus[] = ["draft", "scheduled", "posted"];

export type CalendarPost = Omit<Post, "hashtags"> & { hashtags: string[] };

export type CalendarActionState = { success: boolean; message: string };
