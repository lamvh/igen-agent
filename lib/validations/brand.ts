/**
 * Zod schema validate Brand Profile (server-side).
 * Dùng trong server action upsertBrand qua safeParse.
 */
import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Tên thương hiệu là bắt buộc"),
  industry: z.string().trim().min(1, "Ngành là bắt buộc"),
  products: z.string().trim().default(""),
  toneOfVoice: z.string().trim().default(""),
  audience: z.string().trim().default(""),
  guidelines: z.string().trim().default(""),
  // Nguyên tắc riêng cho prompt sinh ảnh Gemini (nhúng vào imagePromptPrompt).
  imagePromptRules: z.string().trim().default(""),
  // pillars gửi từ form dưới dạng nhiều field cùng tên "pillar";
  // server gom thành mảng rồi loại phần tử rỗng.
  pillars: z.array(z.string().trim().min(1)).default([]),
});

export type BrandInput = z.infer<typeof brandSchema>;
