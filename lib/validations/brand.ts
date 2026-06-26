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
  // pillars gửi từ form dưới dạng nhiều field cùng tên "pillar";
  // server gom thành mảng rồi loại phần tử rỗng.
  pillars: z.array(z.string().trim().min(1)).default([]),
  // Danh sách tag định sẵn để phân loại ý tưởng; gửi như nhiều field "tag".
  tags: z.array(z.string().trim().min(1)).default([]),
});

export type BrandInput = z.infer<typeof brandSchema>;
