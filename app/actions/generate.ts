"use server";

/**
 * Server actions sinh nội dung bằng Claude (server-only — API key không lộ client).
 * - generateIdeas: sinh danh sách ý tưởng theo pillar + nền tảng → lưu bảng idea.
 * - generateCaption: từ 1 ý tưởng sinh caption cho cả 3 nền tảng → tạo 3 post draft → redirect editor.
 *
 * Degrade gracefully: thiếu ANTHROPIC_API_KEY → trả lỗi thân thiện, không crash.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@/db";
import { idea, post } from "@/db/schema";
import { getBrand } from "@/app/actions/brand";
import { getClaudeClient, hasApiKey, CLAUDE_MODEL } from "@/lib/ai/claude-client";
import {
  ideaPrompt,
  outlinePrompt,
  refineOutlinePrompt,
  captionPrompt,
  imagePromptPrompt,
  PLATFORMS,
  type Platform,
  type IdeaLength,
  type IdeaGoal,
  type CaptionLength,
  type OutlineDepth,
  type OutlinePerspective,
} from "@/lib/ai/prompts";
import {
  ideaListSchema,
  ideaOutlineSchema,
  captionSchema,
  imagePromptSchema,
  formatOutline,
} from "@/lib/validations/generate";
import { serializeJsonArray } from "@/lib/json";
import { appendOutlineVersion } from "@/lib/outline-versions";
import { logUsage } from "@/lib/ai/usage";

// Ràng buộc số lượng ý tưởng — chặn giá trị bất thường từ form.
const IDEA_COUNT_DEFAULT = 6;
const IDEA_COUNT_MIN = 1;
const IDEA_COUNT_MAX = 10;
const TEXT_MAX = 200; // giới hạn độ dài ô target/tone để prompt không phình.

const IDEA_LENGTHS: IdeaLength[] = ["short", "medium", "long"];
const CAPTION_LENGTHS: CaptionLength[] = ["xshort", "short", "medium", "long", "article"];
const OUTLINE_DEPTHS: OutlineDepth[] = ["brief", "standard", "deep"];
const OUTLINE_PERSPECTIVES: OutlinePerspective[] = ["brand", "personal", "expert"];
const IDEA_GOALS: IdeaGoal[] = ["engagement", "sales", "education", "awareness"];

/** Ép kiểu platform an toàn từ input không tin cậy; mặc định facebook. */
function toPlatform(value: FormDataEntryValue | null): Platform {
  const raw = String(value ?? "");
  return PLATFORMS.includes(raw as Platform) ? (raw as Platform) : "facebook";
}

/** Parse số lượng ý tưởng, kẹp trong [MIN, MAX], mặc định nếu không hợp lệ. */
function toCount(value: FormDataEntryValue | null): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return IDEA_COUNT_DEFAULT;
  return Math.min(IDEA_COUNT_MAX, Math.max(IDEA_COUNT_MIN, n));
}

function toLength(value: FormDataEntryValue | null): IdeaLength {
  const raw = String(value ?? "");
  return IDEA_LENGTHS.includes(raw as IdeaLength) ? (raw as IdeaLength) : "medium";
}

function toGoal(value: FormDataEntryValue | null): IdeaGoal {
  const raw = String(value ?? "");
  return IDEA_GOALS.includes(raw as IdeaGoal) ? (raw as IdeaGoal) : "engagement";
}

/** Lấy text tùy chọn (target/tone): trim + cắt độ dài; trống → undefined. */
function toOptionalText(value: FormDataEntryValue | null): string | undefined {
  const raw = String(value ?? "").trim().slice(0, TEXT_MAX);
  return raw || undefined;
}

export type GenerateState = { success: boolean; message: string };

const NO_BRAND: GenerateState = {
  success: false,
  message: "Vui lòng tạo Brand Profile trước khi sinh nội dung.",
};
const NO_KEY: GenerateState = {
  success: false,
  message: "Chưa cấu hình ANTHROPIC_API_KEY — không thể sinh tự động. Bạn vẫn có thể nhập caption thủ công.",
};

/** Sinh ý tưởng theo pillar + nền tảng, lưu vào DB. Dùng cho useActionState. */
export async function generateIdeas(_prev: GenerateState, formData: FormData): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const pillar = String(formData.get("pillar") ?? "").trim();
  // Server action là endpoint công khai → validate mọi input thay vì tin form.
  if (!pillar) return { success: false, message: "Vui lòng chọn/nhập content pillar." };

  const opts = {
    count: toCount(formData.get("count")),
    length: toLength(formData.get("length")),
    goal: toGoal(formData.get("goal")),
    target: toOptionalText(formData.get("target")),
    tone: toOptionalText(formData.get("tone")),
  };

  let savedCount = 0;
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(ideaListSchema),
      },
      messages: [{ role: "user", content: ideaPrompt(brand, pillar, opts) }],
    });

    await logUsage("ideas", result.usage);
    const ideas = (result.parsed_output?.ideas ?? []).map((t) => t.trim()).filter(Boolean);
    if (!ideas.length) {
      return { success: false, message: "Không sinh được ý tưởng, vui lòng thử lại." };
    }

    await db.insert(idea).values(
      ideas.map((title) => ({ brandId: brand.id, title, pillar, status: "draft" })),
    );
    savedCount = ideas.length;
  } catch (err) {
    console.error("generateIdeas failed:", err);
    return { success: false, message: "Sinh ý tưởng thất bại, vui lòng thử lại." };
  }

  revalidatePath("/ideas");
  return { success: true, message: `Đã sinh ${savedCount} ý tưởng.` };
}

export type PromptState = GenerateState & { prompt?: string };

/**
 * Sinh prompt ý tưởng (KHÔNG gọi Claude, không tốn token) để copy sang Claude app.
 * Cùng tham số + cùng hàm dựng prompt với generateIdeas nên prompt copy = prompt API.
 */
export async function buildIdeaPrompt(formData: FormData): Promise<PromptState> {
  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const pillar = String(formData.get("pillar") ?? "").trim();
  if (!pillar) return { success: false, message: "Vui lòng chọn/nhập content pillar." };

  const opts = {
    count: toCount(formData.get("count")),
    length: toLength(formData.get("length")),
    goal: toGoal(formData.get("goal")),
    target: toOptionalText(formData.get("target")),
    tone: toOptionalText(formData.get("tone")),
  };

  return { success: true, message: "", prompt: ideaPrompt(brand, pillar, opts) };
}

/**
 * Sinh prompt dàn ý (KHÔNG gọi Claude, không tốn token) để copy sang Claude app.
 * `depth` do người dùng chọn (ngắn gọn/tiêu chuẩn/chuyên sâu).
 */
export async function buildOutlinePrompt(
  ideaId: number,
  depth: OutlineDepth = "standard",
  perspective: OutlinePerspective = "brand",
): Promise<PromptState> {
  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  const safeDepth: OutlineDepth = OUTLINE_DEPTHS.includes(depth) ? depth : "standard";
  const safePerspective: OutlinePerspective = OUTLINE_PERSPECTIVES.includes(perspective)
    ? perspective
    : "brand";
  return {
    success: true,
    message: "",
    prompt: outlinePrompt(brand, current.title, safeDepth, safePerspective),
  };
}

/**
 * Sinh prompt content từ 1 Ý TƯỞNG (KHÔNG gọi Claude, không tốn token) — content
 * brief đầy đủ (ý tưởng + dàn ý + brand context + quy tắc nền tảng) để copy sang
 * AI agent bất kỳ, không cần tạo post trước. Dùng ở panel ý tưởng.
 */
export async function buildContentPrompt(
  ideaId: number,
  platform: Platform,
  length: CaptionLength,
): Promise<PromptState> {
  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  const safeLength: CaptionLength = CAPTION_LENGTHS.includes(length) ? length : "medium";
  const prompt = captionPrompt(brand, current.title, toPlatform(platform), current.outline, safeLength);
  return { success: true, message: "", prompt };
}

/**
 * Sinh prompt content cho 1 POST đã có (KHÔNG gọi Claude, không tốn token) —
 * cùng brief như buildContentPrompt nhưng nền tảng lấy từ post. Dùng trong editor
 * (vd muốn nhờ AI ngoài viết lại content với độ dài khác).
 */
export async function buildCaptionPrompt(
  postId: number,
  length: CaptionLength = "medium",
): Promise<PromptState> {
  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy post." };

  let ideaTitle = "";
  let outline: string | null = null;
  if (current.ideaId) {
    const ir = await db.select().from(idea).where(eq(idea.id, current.ideaId)).limit(1);
    ideaTitle = ir[0]?.title ?? "";
    outline = ir[0]?.outline ?? null;
  }

  const safeLength: CaptionLength = CAPTION_LENGTHS.includes(length) ? length : "medium";
  const prompt = captionPrompt(brand, ideaTitle || "(nội dung tự do)", toPlatform(current.platform), outline, safeLength);
  return { success: true, message: "", prompt };
}

/** Gọi Claude sinh 1 image-generation prompt từ nội dung cho trước; null nếu lỗi. */
async function buildImagePrompt(content: string, platform: Platform): Promise<string | null> {
  const brand = await getBrand();
  if (!brand) return null;
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(imagePromptSchema) },
      messages: [{ role: "user", content: imagePromptPrompt(brand, content, platform) }],
    });
    await logUsage("caption", result.usage);
    return result.parsed_output?.prompt?.trim() || null;
  } catch (err) {
    console.error("buildImagePrompt failed:", err);
    return null;
  }
}

/**
 * Tạo prompt ảnh (tiếng Anh) cho 1 ý tưởng — dựa trên tiêu đề + dàn ý nếu có.
 * Lưu vào idea.imagePrompt để copy dán sang Gemini sau (chưa tích hợp Gemini trực tiếp).
 */
export async function generateImagePromptForIdea(ideaId: number): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;
  if (!(await getBrand())) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  const content = current.outline ? `${current.title}\n\n${current.outline}` : current.title;
  // Ý tưởng không gắn nền tảng → dùng facebook làm tỉ lệ/aesthetic mặc định cho prompt ảnh.
  const prompt = await buildImagePrompt(content, "facebook");
  if (!prompt) return { success: false, message: "Tạo prompt ảnh thất bại, vui lòng thử lại." };

  await db.update(idea).set({ imagePrompt: prompt }).where(eq(idea.id, ideaId));
  revalidatePath("/ideas");
  return { success: true, message: "Đã tạo prompt ảnh." };
}

/** Tạo prompt ảnh cho 1 post — dựa trên caption hiện tại. Lưu vào post.imagePrompt. */
export async function generateImagePromptForPost(postId: number): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;
  if (!(await getBrand())) return NO_BRAND;

  const rows = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy post." };

  const content = current.caption?.trim() || "(chưa có caption)";
  const prompt = await buildImagePrompt(content, toPlatform(current.platform));
  if (!prompt) return { success: false, message: "Tạo prompt ảnh thất bại, vui lòng thử lại." };

  await db.update(post).set({ imagePrompt: prompt }).where(eq(post.id, postId));
  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã tạo prompt ảnh." };
}

/**
 * Bước 2 quy trình: triển khai 1 tiêu đề ý tưởng thành dàn ý chi tiết, lưu vào idea.outline.
 * Cho phép xem/duyệt bản phác trước khi tốn công sinh caption đầy đủ.
 */
export async function generateOutline(
  ideaId: number,
  depth: OutlineDepth = "standard",
  perspective: OutlinePerspective = "brand",
): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  const safeDepth: OutlineDepth = OUTLINE_DEPTHS.includes(depth) ? depth : "standard";
  const safePerspective: OutlinePerspective = OUTLINE_PERSPECTIVES.includes(perspective)
    ? perspective
    : "brand";
  let outlineText = "";
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(ideaOutlineSchema) },
      messages: [
        { role: "user", content: outlinePrompt(brand, current.title, safeDepth, safePerspective) },
      ],
    });
    await logUsage("outline", result.usage);
    const parsed = result.parsed_output;
    if (!parsed) return { success: false, message: "Không tạo được dàn ý, vui lòng thử lại." };
    outlineText = formatOutline(parsed);
  } catch (err) {
    console.error("generateOutline failed:", err);
    return { success: false, message: "Tạo dàn ý thất bại, vui lòng thử lại." };
  }

  await db
    .update(idea)
    .set({
      outline: outlineText,
      outlineVersions: appendOutlineVersion(current.outlineVersions, outlineText, "generate"),
    })
    .where(eq(idea.id, ideaId));
  revalidatePath("/ideas");
  return { success: true, message: "Đã tạo dàn ý." };
}

/**
 * Tinh chỉnh dàn ý hiện có theo yêu cầu người dùng (AI viết lại dựa trên bản hiện tại).
 * Cần ý tưởng đã có dàn ý; ghi đè idea.outline bằng bản mới.
 */
export async function refineOutline(ideaId: number, instruction: string): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const note = instruction.trim();
  if (!note) return { success: false, message: "Vui lòng nhập yêu cầu chỉnh sửa." };

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };
  if (!current.outline) {
    return { success: false, message: "Chưa có dàn ý để chỉnh — hãy tạo dàn ý trước." };
  }

  let outlineText = "";
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(ideaOutlineSchema) },
      messages: [
        {
          role: "user",
          content: refineOutlinePrompt(brand, current.title, current.outline, note),
        },
      ],
    });
    await logUsage("outline", result.usage);
    const parsed = result.parsed_output;
    if (!parsed) return { success: false, message: "Không cập nhật được dàn ý, vui lòng thử lại." };
    outlineText = formatOutline(parsed);
  } catch (err) {
    console.error("refineOutline failed:", err);
    return { success: false, message: "Cập nhật dàn ý thất bại, vui lòng thử lại." };
  }

  await db
    .update(idea)
    .set({
      outline: outlineText,
      outlineVersions: appendOutlineVersion(current.outlineVersions, outlineText, "refine"),
    })
    .where(eq(idea.id, ideaId));
  revalidatePath("/ideas");
  return { success: true, message: "Đã cập nhật dàn ý." };
}

/** Gọi Claude sinh caption + hashtags cho 1 nền tảng từ 1 ý tưởng; null nếu lỗi. */
async function buildCaptionValue(
  idea_: typeof idea.$inferSelect,
  platform: Platform,
  length: CaptionLength = "medium",
): Promise<{ caption: string; hashtags: string[] } | null> {
  const brand = await getBrand();
  if (!brand) return null;
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      output_config: { effort: "medium", format: zodOutputFormat(captionSchema) },
      messages: [
        {
          role: "user",
          content: captionPrompt(brand, idea_.title, platform, idea_.outline, length),
        },
      ],
    });
    await logUsage("caption", result.usage);
    const caption = result.parsed_output?.caption?.trim() ?? "";
    if (!caption) return null;
    const hashtags = (result.parsed_output?.hashtags ?? []).map((h) => h.trim()).filter(Boolean);
    return { caption, hashtags };
  } catch (err) {
    console.error("generateCaptionContent failed:", err);
    return null;
  }
}

/**
 * Từ 1 ý tưởng sinh caption cho ĐÚNG 1 nền tảng (mặc định facebook để tiết kiệm token),
 * tạo 1 post draft rồi redirect tới editor. Bám dàn ý nếu có. IG/TikTok sinh sau trong editor.
 */
export async function generateCaption(
  ideaId: number,
  platform: Platform = "facebook",
  length: CaptionLength = "medium",
): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;
  if (!(await getBrand())) return NO_BRAND;

  const target = PLATFORMS.includes(platform) ? platform : "facebook";
  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  const built = await buildCaptionValue(current, target, length);
  if (!built) return { success: false, message: "Sinh caption thất bại, vui lòng thử lại." };

  const newId = await db.transaction(async (tx) => {
    const ids = await tx
      .insert(post)
      .values({
        ideaId: current.id,
        platform: target,
        caption: built.caption,
        hashtags: serializeJsonArray(built.hashtags),
        status: "draft",
      })
      .returning({ id: post.id });
    return ids[0]?.id ?? null;
  });

  if (newId === null) return { success: false, message: "Không tạo được caption, vui lòng thử lại." };

  revalidatePath("/ideas");
  redirect(`/editor/${newId}`);
}

/**
 * Sinh caption cho 1 nền tảng CHƯA có post của ý tưởng (dùng trong editor — tab on-demand).
 * Tạo post mới cùng ideaId; trả về (không redirect) để editor refresh tại chỗ.
 * Nếu nền tảng đó đã có post → trả lỗi để tránh trùng.
 */
export async function generateCaptionForPlatform(
  ideaId: number,
  platform: Platform,
  length: CaptionLength = "medium",
): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;
  if (!(await getBrand())) return NO_BRAND;
  if (!PLATFORMS.includes(platform)) {
    return { success: false, message: "Nền tảng không hợp lệ." };
  }

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  // Chặn trùng: nếu nền tảng này đã có post cho ý tưởng thì không sinh nữa.
  const existing = await db
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.ideaId, ideaId), eq(post.platform, platform)))
    .limit(1);
  if (existing[0]) return { success: false, message: "Nền tảng này đã có nội dung." };

  const built = await buildCaptionValue(current, platform, length);
  if (!built) return { success: false, message: "Sinh caption thất bại, vui lòng thử lại." };

  try {
    await db.insert(post).values({
      ideaId: current.id,
      platform,
      caption: built.caption,
      hashtags: serializeJsonArray(built.hashtags),
      status: "draft",
    });
  } catch (err) {
    console.error("generateCaptionForPlatform insert failed:", err);
    return { success: false, message: "Không tạo được caption, vui lòng thử lại." };
  }

  revalidatePath("/ideas");
  return { success: true, message: "Đã tạo nội dung." };
}

/**
 * Viết lại caption + hashtags cho ĐÚNG 1 post đang sửa (không tạo post mới).
 * Bám dàn ý của ý tưởng nếu có. Ghi đè caption/hashtags hiện tại.
 */
export async function regenerateCaption(postId: number): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy post." };

  // Lấy tiêu đề + dàn ý từ ý tưởng gốc (nếu post còn liên kết idea).
  let ideaTitle = "";
  let outline: string | null = null;
  if (current.ideaId) {
    const ir = await db.select().from(idea).where(eq(idea.id, current.ideaId)).limit(1);
    ideaTitle = ir[0]?.title ?? "";
    outline = ir[0]?.outline ?? null;
  }

  const platform = toPlatform(current.platform);

  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      output_config: { effort: "medium", format: zodOutputFormat(captionSchema) },
      messages: [
        { role: "user", content: captionPrompt(brand, ideaTitle || "(nội dung tự do)", platform, outline) },
      ],
    });
    await logUsage("caption", result.usage);
    const caption = result.parsed_output?.caption?.trim() ?? "";
    const hashtags = (result.parsed_output?.hashtags ?? []).map((h) => h.trim()).filter(Boolean);
    if (!caption) return { success: false, message: "Không sinh được caption, vui lòng thử lại." };

    await db
      .update(post)
      .set({ caption, hashtags: serializeJsonArray(hashtags) })
      .where(eq(post.id, postId));
  } catch (err) {
    console.error("regenerateCaption failed:", err);
    return { success: false, message: "Viết lại caption thất bại, vui lòng thử lại." };
  }

  revalidatePath(`/editor/${postId}`);
  return { success: true, message: "Đã viết lại caption." };
}
