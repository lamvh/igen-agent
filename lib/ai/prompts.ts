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

/** Độ dài tiêu đề ý tưởng — ánh xạ sang hướng dẫn cụ thể trong prompt. */
export type IdeaLength = "short" | "medium" | "long";

export const IDEA_LENGTH_LABELS: Record<IdeaLength, string> = {
  short: "Ngắn (≤ 8 từ)",
  medium: "Vừa (8–15 từ)",
  long: "Dài, mô tả rõ",
};

const IDEA_LENGTH_RULES: Record<IdeaLength, string> = {
  short: "Mỗi tiêu đề RẤT NGẮN, tối đa 8 từ, súc tích như một cú hook.",
  medium: "Mỗi tiêu đề độ dài vừa phải, khoảng 8–15 từ.",
  long: "Mỗi tiêu đề dài và mô tả rõ ràng, có thể tới 20–25 từ.",
};

/** Mục tiêu của bài viết — định hướng góc nội dung. */
export type IdeaGoal = "engagement" | "sales" | "education" | "awareness";

export const IDEA_GOAL_LABELS: Record<IdeaGoal, string> = {
  engagement: "Tương tác",
  sales: "Bán hàng",
  education: "Giáo dục",
  awareness: "Nhận diện thương hiệu",
};

const IDEA_GOAL_RULES: Record<IdeaGoal, string> = {
  engagement: "Mục tiêu: tối đa hóa tương tác (bình luận, chia sẻ) — dùng câu hỏi, chủ đề gây bàn luận.",
  sales: "Mục tiêu: thúc đẩy bán hàng — nhấn lợi ích sản phẩm, ưu đãi, lý do mua ngay.",
  education: "Mục tiêu: giáo dục/cung cấp giá trị — mẹo, hướng dẫn, kiến thức hữu ích.",
  awareness: "Mục tiêu: tăng nhận diện thương hiệu — kể câu chuyện thương hiệu, giá trị cốt lõi, dấu ấn riêng.",
};

/** Tùy chọn bổ sung cho lần sinh ý tưởng (đều không bắt buộc trừ count). */
export type IdeaOptions = {
  count: number;
  length: IdeaLength;
  goal: IdeaGoal;
  /** Ghi đè đối tượng mục tiêu cho lần sinh này; trống → dùng audience của brand. */
  target?: string;
  /** Ghi đè tông giọng cho lần sinh này; trống → dùng toneOfVoice của brand. */
  tone?: string;
};

/** Prompt sinh danh sách ý tưởng (title) theo pillar + nền tảng + tùy chọn. */
export function ideaPrompt(
  brand: BrandView,
  pillar: string,
  platform: Platform,
  opts: IdeaOptions,
): string {
  // Dòng ghi đè chỉ thêm vào prompt khi người dùng nhập (nếu trống đã có trong brandContext).
  const overrides = [
    opts.target ? `Đối tượng mục tiêu cho lần này: ${opts.target}` : "",
    opts.tone ? `Tông giọng mong muốn: ${opts.tone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `Bạn là chuyên gia sáng tạo nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}
${overrides ? `\n${overrides}\n` : ""}
Hãy sinh ${opts.count} ý tưởng nội dung (chỉ tiêu đề/title) cho content pillar "${pillar}" trên ${PLATFORM_LABELS[platform]}.

Yêu cầu:
- ${IDEA_LENGTH_RULES[opts.length]}
- ${IDEA_GOAL_RULES[opts.goal]}
- Mỗi ý tưởng hấp dẫn, cụ thể, khả thi, bằng tiếng Việt. Không giải thích thêm.`;
}

/** Prompt triển khai 1 tiêu đề ý tưởng thành dàn ý chi tiết (hook + ý chính + CTA). */
export function outlinePrompt(brand: BrandView, ideaTitle: string, platform: Platform): string {
  return `Bạn là chuyên gia lên dàn ý nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Tiêu đề ý tưởng: "${ideaTitle}"
Nền tảng: ${PLATFORM_LABELS[platform]}

Hãy triển khai tiêu đề trên thành một dàn ý chi tiết cho bài đăng:
- hook: một câu mở đầu thu hút mạnh.
- points: 3–5 ý chính cần truyền tải (mỗi ý một câu ngắn gọn).
- cta: một lời kêu gọi hành động phù hợp.
Tất cả bằng tiếng Việt, bám sát thương hiệu và nền tảng.`;
}

/**
 * Prompt sinh caption + hashtags cho 1 ý tưởng trên 1 nền tảng.
 * Nếu có dàn ý (outline) thì viết caption bám theo dàn ý đó để chất lượng cao hơn.
 */
export function captionPrompt(
  brand: BrandView,
  ideaTitle: string,
  platform: Platform,
  outline?: string | null,
): string {
  return `Bạn là chuyên gia viết caption mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Ý tưởng: "${ideaTitle}"
${outline ? `\nDàn ý cần bám theo:\n${outline}\n` : ""}
Quy tắc nền tảng — ${PLATFORM_RULES[platform]}

Hãy viết caption hoàn chỉnh bằng tiếng Việt theo đúng quy tắc nền tảng trên${outline ? " và bám sát dàn ý" : ""}, kèm danh sách hashtag (không bao gồm dấu # trong từng phần tử mảng).`;
}
