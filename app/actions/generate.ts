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
import { eq } from "drizzle-orm";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { db } from "@/db";
import { idea, post } from "@/db/schema";
import { getBrand } from "@/app/actions/brand";
import { getClaudeClient, hasApiKey, CLAUDE_MODEL } from "@/lib/ai/claude-client";
import {
  ideaPrompt,
  outlinePrompt,
  captionPrompt,
  PLATFORMS,
  type Platform,
  type IdeaLength,
  type IdeaGoal,
} from "@/lib/ai/prompts";
import {
  ideaListSchema,
  ideaOutlineSchema,
  captionSchema,
  formatOutline,
} from "@/lib/validations/generate";
import { serializeJsonArray } from "@/lib/json";

// Ràng buộc số lượng ý tưởng — chặn giá trị bất thường từ form.
const IDEA_COUNT_DEFAULT = 6;
const IDEA_COUNT_MIN = 3;
const IDEA_COUNT_MAX = 10;
const TEXT_MAX = 200; // giới hạn độ dài ô target/tone để prompt không phình.

const IDEA_LENGTHS: IdeaLength[] = ["short", "medium", "long"];
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
  const platform = toPlatform(formData.get("platform"));
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
      messages: [{ role: "user", content: ideaPrompt(brand, pillar, platform, opts) }],
    });

    const ideas = (result.parsed_output?.ideas ?? []).map((t) => t.trim()).filter(Boolean);
    if (!ideas.length) {
      return { success: false, message: "Không sinh được ý tưởng, vui lòng thử lại." };
    }

    await db.insert(idea).values(
      ideas.map((title) => ({ brandId: brand.id, title, pillar, platform, status: "draft" })),
    );
    savedCount = ideas.length;
  } catch {
    return { success: false, message: "Sinh ý tưởng thất bại, vui lòng thử lại." };
  }

  revalidatePath("/ideas");
  return { success: true, message: `Đã sinh ${savedCount} ý tưởng.` };
}

/**
 * Bước 2 quy trình: triển khai 1 tiêu đề ý tưởng thành dàn ý chi tiết, lưu vào idea.outline.
 * Cho phép xem/duyệt bản phác trước khi tốn công sinh caption đầy đủ.
 */
export async function generateOutline(ideaId: number): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  // Mặc định facebook nếu ý tưởng chưa gắn nền tảng (cột nullable).
  const platform = toPlatform(current.platform);

  let outlineText = "";
  try {
    const client = getClaudeClient();
    const result = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(ideaOutlineSchema) },
      messages: [{ role: "user", content: outlinePrompt(brand, current.title, platform) }],
    });
    const parsed = result.parsed_output;
    if (!parsed) return { success: false, message: "Không tạo được dàn ý, vui lòng thử lại." };
    outlineText = formatOutline(parsed);
  } catch {
    return { success: false, message: "Tạo dàn ý thất bại, vui lòng thử lại." };
  }

  await db.update(idea).set({ outline: outlineText }).where(eq(idea.id, ideaId));
  revalidatePath("/ideas");
  return { success: true, message: "Đã tạo dàn ý." };
}

/**
 * Từ 1 ý tưởng sinh caption cho cả 3 nền tảng, tạo 3 post draft, rồi redirect tới editor post đầu.
 * Nếu ý tưởng đã có dàn ý → caption bám theo dàn ý đó.
 * Nhận ideaId qua bind. Trả GenerateState nếu lỗi (redirect xảy ra khi thành công).
 */
export async function generateCaption(ideaId: number): Promise<GenerateState> {
  if (!hasApiKey()) return NO_KEY;

  const brand = await getBrand();
  if (!brand) return NO_BRAND;

  const rows = await db.select().from(idea).where(eq(idea.id, ideaId)).limit(1);
  const current = rows[0];
  if (!current) return { success: false, message: "Không tìm thấy ý tưởng." };

  // Sinh caption cho cả 3 nền tảng TRƯỚC, rồi insert một lần trong transaction
  // → tránh post mồ côi nếu một lời gọi Claude lỗi giữa chừng (atomic all-or-nothing).
  let values: (typeof post.$inferInsert)[];
  try {
    const client = getClaudeClient();
    values = await Promise.all(
      PLATFORMS.map(async (platform) => {
        const result = await client.messages.parse({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          output_config: { effort: "medium", format: zodOutputFormat(captionSchema) },
          messages: [
            { role: "user", content: captionPrompt(brand, current.title, platform, current.outline) },
          ],
        });
        const caption = result.parsed_output?.caption?.trim() ?? "";
        const hashtags = (result.parsed_output?.hashtags ?? []).map((h) => h.trim()).filter(Boolean);
        return {
          ideaId: current.id,
          platform,
          caption,
          hashtags: serializeJsonArray(hashtags),
          status: "draft",
        };
      }),
    );
  } catch {
    return { success: false, message: "Sinh caption thất bại, vui lòng thử lại." };
  }

  const firstPostId = db.transaction((tx) => {
    const ids = tx.insert(post).values(values).returning({ id: post.id }).all();
    return ids[0]?.id ?? null;
  });

  if (firstPostId === null) {
    return { success: false, message: "Không tạo được caption, vui lòng thử lại." };
  }

  revalidatePath("/ideas");
  redirect(`/editor/${firstPostId}`);
}
