/**
 * Prompt template tiếng Việt cho sinh nội dung.
 * Nhúng ngữ cảnh brand + quy tắc riêng từng nền tảng (FB/IG/TikTok).
 */
import type { BrandView } from "@/app/actions/brand";

export type Platform = "facebook" | "instagram" | "tiktok";

export const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

/** Quy tắc nội dung từng nền tảng — đưa vào prompt caption. */
const PLATFORM_RULES: Record<Platform, string> = {
  facebook:
    "Facebook: caption dài hơn, kể chuyện (storytelling), dẫn dắt cảm xúc, có thể 2-4 đoạn. Ít hashtag (0-3).",
  instagram:
    "Instagram: caption ngắn gọn, bắt mắt, nhiều emoji phù hợp, kết bằng 5-12 hashtag liên quan.",
  tiktok:
    "TikTok: hook cực mạnh ở câu đầu (3 giây vàng), giọng trẻ trung, CTA rõ ràng, 3-6 hashtag xu hướng.",
};

/**
 * Tóm tắt brand để nhúng vào prompt.
 * Lưu ý: text brand/idea nhúng trực tiếp (chưa escape) — chấp nhận được cho
 * local single-user v1. Nếu chuyển multi-tenant cần xử lý prompt injection.
 */
function brandContext(brand: BrandView): string {
  const pillars = brand.pillars.length ? brand.pillars.join(", ") : "(chưa có)";
  return [
    `Thương hiệu: ${brand.name}`,
    `Ngành: ${brand.industry}`,
    brand.products ? `Sản phẩm/dịch vụ: ${brand.products}` : "",
    brand.toneOfVoice ? `Tông giọng: ${brand.toneOfVoice}` : "",
    brand.audience ? `Đối tượng: ${brand.audience}` : "",
    `Content pillars: ${pillars}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Prompt sinh danh sách ý tưởng (title) theo pillar + nền tảng. */
export function ideaPrompt(brand: BrandView, pillar: string, platform: Platform, count: number): string {
  return `Bạn là chuyên gia sáng tạo nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Hãy sinh ${count} ý tưởng nội dung NGẮN GỌN (chỉ tiêu đề/title) cho content pillar "${pillar}" trên ${PLATFORM_LABELS[platform]}.
Mỗi ý tưởng là một tiêu đề hấp dẫn, cụ thể, khả thi, bằng tiếng Việt. Không giải thích thêm.`;
}

/** Prompt sinh caption + hashtags cho 1 ý tưởng trên 1 nền tảng. */
export function captionPrompt(brand: BrandView, ideaTitle: string, platform: Platform): string {
  return `Bạn là chuyên gia viết caption mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Ý tưởng: "${ideaTitle}"

Quy tắc nền tảng — ${PLATFORM_RULES[platform]}

Hãy viết caption hoàn chỉnh bằng tiếng Việt theo đúng quy tắc nền tảng trên, kèm danh sách hashtag (không bao gồm dấu # trong từng phần tử mảng).`;
}
