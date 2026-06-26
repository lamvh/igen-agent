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

/** Dàn ý triển khai từ 1 tiêu đề ý tưởng. */
export const ideaOutlineSchema = z.object({
  hook: z.string(), // câu mở đầu thu hút
  points: z.array(z.string()), // các ý chính
  cta: z.string(), // lời kêu gọi hành động
});

/** Caption + hashtags cho 1 nền tảng. */
export const captionSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
});

/** Prompt tạo ảnh (tiếng Anh) cho Gemini/Nano Banana. */
export const imagePromptSchema = z.object({
  prompt: z.string(),
});

export type IdeaList = z.infer<typeof ideaListSchema>;
export type IdeaOutline = z.infer<typeof ideaOutlineSchema>;
export type CaptionResult = z.infer<typeof captionSchema>;

/** Gộp dàn ý thành text nhiều dòng để lưu DB / nhúng prompt. */
export function formatOutline(o: IdeaOutline): string {
  const points = o.points.map((p, i) => `${i + 1}. ${p}`).join("\n");
  return `Hook: ${o.hook}\n\nNội dung chính:\n${points}\n\nCTA: ${o.cta}`;
}
