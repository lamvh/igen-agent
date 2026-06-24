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
import { ideaPrompt, captionPrompt, PLATFORMS, type Platform } from "@/lib/ai/prompts";
import { ideaListSchema, captionSchema } from "@/lib/validations/generate";
import { serializeJsonArray } from "@/lib/json";

const IDEA_COUNT = 6; // sinh >=5 ý tưởng theo success criteria

/** Ép kiểu platform an toàn từ input không tin cậy; mặc định facebook. */
function toPlatform(value: FormDataEntryValue | null): Platform {
  const raw = String(value ?? "");
  return PLATFORMS.includes(raw as Platform) ? (raw as Platform) : "facebook";
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
  // Server action là endpoint công khai → validate platform thay vì tin form.
  const platform = toPlatform(formData.get("platform"));
  if (!pillar) return { success: false, message: "Vui lòng chọn/nhập content pillar." };

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
      messages: [{ role: "user", content: ideaPrompt(brand, pillar, platform, IDEA_COUNT) }],
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
 * Từ 1 ý tưởng sinh caption cho cả 3 nền tảng, tạo 3 post draft, rồi redirect tới editor post đầu.
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
          messages: [{ role: "user", content: captionPrompt(brand, current.title, platform) }],
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
