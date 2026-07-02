/**
 * Prompt template tiếng Việt cho sinh nội dung.
 * Nhúng ngữ cảnh brand + quy tắc riêng từng nền tảng (FB/IG/TikTok).
 */
import type { BrandView } from "@/app/actions/brand";

export type Platform = "facebook" | "instagram" | "tiktok" | "blog";

export const PLATFORMS: Platform[] = ["facebook", "instagram", "tiktok", "blog"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  blog: "Website/Blog",
};

/** Quy tắc nội dung từng nền tảng — đưa vào prompt caption. */
const PLATFORM_RULES: Record<Platform, string> = {
  facebook:
    "Facebook: caption dài hơn, kể chuyện (storytelling), dẫn dắt cảm xúc, có thể 2-4 đoạn. Ít hashtag (0-3).",
  instagram:
    "Instagram: caption ngắn gọn, bắt mắt, nhiều emoji phù hợp, kết bằng 5-12 hashtag liên quan.",
  tiktok:
    "TikTok: hook cực mạnh ở câu đầu (3 giây vàng), giọng trẻ trung, CTA rõ ràng, 3-6 hashtag xu hướng.",
  blog: "Website/Blog: bài dài chuẩn SEO, có mở bài–thân bài–kết bài rõ ràng, có thể chèn tiêu đề phụ, giọng chuẩn thương hiệu. Ít hoặc không dùng hashtag.",
};

/**
 * Tóm tắt brand để nhúng vào prompt.
 * Lưu ý: text brand/idea nhúng trực tiếp (chưa escape) — chấp nhận được cho
 * local single-user v1. Nếu chuyển multi-tenant cần xử lý prompt injection.
 */
function brandContext(brand: BrandView): string {
  const pillars = brand.pillars.length ? brand.pillars.join(", ") : "(chưa có)";
  const guidelines = brand.guidelines?.trim();
  return [
    `Thương hiệu: ${brand.name}`,
    `Ngành: ${brand.industry}`,
    brand.products ? `Sản phẩm/dịch vụ: ${brand.products}` : "",
    brand.toneOfVoice ? `Tông giọng: ${brand.toneOfVoice}` : "",
    brand.audience ? `Đối tượng: ${brand.audience}` : "",
    `Content pillars: ${pillars}`,
    // Nguyên tắc bắt buộc — đặt cuối + nhấn mạnh để AI ưu tiên tuân thủ.
    guidelines ? `\nNGUYÊN TẮC BẮT BUỘC TUÂN THỦ (luôn áp dụng):\n${guidelines}` : "",
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

/**
 * Prompt sinh danh sách ý tưởng (title) theo pillar + tùy chọn.
 * Ý tưởng là CHUNG cho mọi nền tảng — chỉ cá biệt hóa khi sinh caption.
 */
export function ideaPrompt(
  brand: BrandView,
  pillar: string,
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
Hãy sinh ${opts.count} ý tưởng nội dung (chỉ tiêu đề/title) cho content pillar "${pillar}". Ý tưởng dùng chung cho nhiều nền tảng (Facebook, Instagram, TikTok).

Yêu cầu:
- ${IDEA_LENGTH_RULES[opts.length]}
- ${IDEA_GOAL_RULES[opts.goal]}
- Mỗi ý tưởng hấp dẫn, cụ thể, khả thi, bằng tiếng Việt. Không giải thích thêm.`;
}

/**
 * Prompt yêu cầu Claude viết 1 IMAGE-GENERATION PROMPT (tiếng Anh) cho Gemini/Nano Banana.
 * Bám brand + nội dung; mô tả chủ thể, bố cục, ánh sáng, phong cách, tỉ lệ khung.
 * `content` là tiêu đề/dàn ý (cho ý tưởng) hoặc caption (cho post).
 */
export function imagePromptPrompt(brand: BrandView, content: string, platform: Platform): string {
  // Nguyên tắc riêng cho ảnh do người dùng nhập (tab Thương hiệu) — chèn nếu có.
  const imageRules = brand.imagePromptRules?.trim()
    ? `\nImage rules to obey (from the brand owner):\n${brand.imagePromptRules.trim()}\n`
    : "";

  return `You are an expert prompt engineer for AI image generation (Gemini / Nano Banana).

Brand context:
${brandContext(brand)}
${imageRules}
Content to illustrate (in Vietnamese):
"""
${content}
"""

Target platform: ${PLATFORM_LABELS[platform]}.

Write ONE detailed image-generation prompt IN ENGLISH for this social media post. The prompt must:
- Describe the main subject, composition, background, lighting, color mood, and visual style.
- Fit the brand identity and the platform's typical aesthetic.
- Suggest an aspect ratio suited to ${PLATFORM_LABELS[platform]} (e.g. 1:1, 4:5, or 9:16).
- Be a single ready-to-paste paragraph. Do NOT include any Vietnamese, explanations, or markdown.${imageRules ? "\n- Strictly follow the image rules listed above." : ""}`;
}

/**
 * Prompt triển khai 1 tiêu đề ý tưởng thành dàn ý chi tiết (hook + ý chính + CTA).
 * Dàn ý CHUNG cho mọi nền tảng — không bám riêng nền tảng nào.
 */
export function outlinePrompt(brand: BrandView, ideaTitle: string): string {
  return `Bạn là chuyên gia lên dàn ý nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Tiêu đề ý tưởng: "${ideaTitle}"

Hãy triển khai tiêu đề trên thành một dàn ý chi tiết cho bài đăng (dùng chung cho nhiều nền tảng):
- hook: một câu mở đầu thu hút mạnh.
- points: 3–5 ý chính cần truyền tải (mỗi ý một câu ngắn gọn).
- cta: một lời kêu gọi hành động phù hợp.
Tất cả bằng tiếng Việt, bám sát thương hiệu.`;
}

/**
 * Prompt tinh chỉnh dàn ý hiện có theo yêu cầu của người dùng.
 * Giữ cấu trúc hook/points/cta nhưng điều chỉnh theo `instruction`.
 */
export function refineOutlinePrompt(
  brand: BrandView,
  ideaTitle: string,
  currentOutline: string,
  instruction: string,
): string {
  return `Bạn là chuyên gia lên dàn ý nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Tiêu đề ý tưởng: "${ideaTitle}"

Dàn ý hiện tại:
"""
${currentOutline}
"""

Yêu cầu chỉnh sửa từ người dùng:
"""
${instruction}
"""

Hãy cập nhật lại dàn ý theo yêu cầu trên, vẫn giữ cấu trúc:
- hook: một câu mở đầu thu hút mạnh.
- points: 3–5 ý chính.
- cta: một lời kêu gọi hành động.
Bám sát dàn ý hiện tại, chỉ thay đổi những gì yêu cầu nêu ra. Tất cả bằng tiếng Việt.`;
}

/** Độ dài content — 5 mức, từ 1–2 câu tới bài website rất chi tiết. */
export type CaptionLength = "xshort" | "short" | "medium" | "long" | "article";

export const CAPTION_LENGTH_LABELS: Record<CaptionLength, string> = {
  xshort: "Rất ngắn (1–2 câu)",
  short: "Ngắn (3–5 câu)",
  medium: "Vừa (1–3 đoạn)",
  long: "Dài (nhiều đoạn, kể chuyện)",
  article: "Bài website rất chi tiết",
};

const CAPTION_LENGTH_RULES: Record<CaptionLength, string> = {
  xshort: "Độ dài: RẤT NGẮN, chỉ 1–2 câu súc tích, đi thẳng vào trọng tâm.",
  short: "Độ dài: ngắn gọn, khoảng 3–5 câu trong một đoạn.",
  medium: "Độ dài: vừa phải, khoảng 1–3 đoạn ngắn (~100–200 từ).",
  long: "Độ dài: dài và chi tiết, nhiều đoạn (~300–600 từ), kể chuyện/giải thích kỹ.",
  article:
    "Độ dài: BÀI VIẾT RẤT DÀI VÀ CHI TIẾT chuẩn website/blog (tối thiểu ~1000–1500 từ): mở bài dẫn dắt, thân bài chia nhiều phần với tiêu đề phụ, phân tích sâu kèm ví dụ cụ thể, kết bài có CTA.",
};

/**
 * Prompt sinh caption/content + hashtags cho 1 ý tưởng trên 1 nền tảng.
 * Đây là content brief ĐẦY ĐỦ NHẤT (ý tưởng + dàn ý + ngữ cảnh brand + quy tắc
 * nền tảng) — dùng cho cả lời gọi API lẫn copy-prompt đưa sang AI agent bất kỳ.
 * `length` điều chỉnh độ dài caption (mặc định medium).
 */
export function captionPrompt(
  brand: BrandView,
  ideaTitle: string,
  platform: Platform,
  outline?: string | null,
  length: CaptionLength = "medium",
): string {
  return `Bạn là chuyên gia viết nội dung mạng xã hội tiếng Việt.

Ngữ cảnh thương hiệu:
${brandContext(brand)}

Ý tưởng: "${ideaTitle}"
${outline ? `\nDàn ý cần bám theo (hook → ý chính → CTA):\n${outline}\n` : ""}
Quy tắc nền tảng — ${PLATFORM_RULES[platform]}

Hãy triển khai ${outline ? "ý tưởng và dàn ý" : "ý tưởng"} trên thành bài viết/caption HOÀN CHỈNH, sẵn sàng đăng, bằng tiếng Việt.

Yêu cầu:
- ${CAPTION_LENGTH_RULES[length]}
- Tuân thủ đúng quy tắc nền tảng${outline ? "; bám sát dàn ý, không bỏ sót ý chính nào" : ""}, bám sát tông giọng và nguyên tắc thương hiệu ở trên.
- Kèm danh sách hashtag (không bao gồm dấu # trong từng phần tử).`;
}
