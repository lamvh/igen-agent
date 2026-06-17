/**
 * Zod schema cho output có cấu trúc từ Claude (structured outputs).
 * Lưu ý: structured outputs không hỗ trợ ràng buộc min/max trên array/string
 * → không đặt .min()/.max() ở đây; kiểm số lượng qua prompt.
 */
import { z } from "zod";

/** Danh sách ý tưởng: mảng tiêu đề. */
export const ideaListSchema = z.object({
  ideas: z.array(z.string()),
});

/** Caption + hashtags cho 1 nền tảng. */
export const captionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export type IdeaList = z.infer<typeof ideaListSchema>;
export type CaptionResult = z.infer<typeof captionSchema>;
