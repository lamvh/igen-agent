/**
 * Theo dõi token + ước tính chi phí cho các lần gọi Claude (server-only).
 *
 * Lưu ý: Anthropic KHÔNG có API trả số dư tài khoản còn lại. Đây chỉ là tổng
 * token đã tiêu TRONG app này, nhân đơn giá để ước tính chi phí — không phản
 * ánh số dư thật. Xem số dư thật tại console.anthropic.com.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { usageLog } from "@/db/schema";
import { CLAUDE_MODEL } from "@/lib/ai/claude-client";

/** Đơn giá USD trên 1 triệu token (nguồn: Anthropic pricing, Opus 4.8). */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5.0, output: 25.0 },
};
const DEFAULT_PRICE = { input: 5.0, output: 25.0 };

export type UsageKind = "ideas" | "outline" | "caption";

/** Hình dạng tối thiểu của usage trả về từ SDK (chỉ field cần dùng). */
type ClaudeUsage = { input_tokens?: number; output_tokens?: number };

/**
 * Ghi 1 dòng nhật ký token. Bọc try/catch ở caller hoặc ở đây để việc log
 * không bao giờ làm hỏng luồng sinh nội dung chính.
 */
export async function logUsage(
  kind: UsageKind,
  usage: ClaudeUsage | null | undefined,
  model: string = CLAUDE_MODEL,
): Promise<void> {
  if (!usage) return;
  try {
    await db.insert(usageLog).values({
      model,
      kind,
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
    });
  } catch {
    // Log thất bại không được ảnh hưởng tới kết quả sinh nội dung.
  }
}

export type UsageSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  /** Chi phí ước tính (USD) đã tiêu trong app. */
  estimatedCostUsd: number;
  callCount: number;
};

/** Tổng token + chi phí ước tính trên toàn bộ nhật ký. */
export async function getUsageSummary(): Promise<UsageSummary> {
  const rows = await db
    .select({
      model: usageLog.model,
      input: sql<number>`coalesce(sum(${usageLog.inputTokens}), 0)`,
      output: sql<number>`coalesce(sum(${usageLog.outputTokens}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(usageLog)
    .groupBy(usageLog.model);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let estimatedCostUsd = 0;
  let callCount = 0;

  for (const r of rows) {
    const price = PRICE_PER_MTOK[r.model] ?? DEFAULT_PRICE;
    totalInputTokens += r.input;
    totalOutputTokens += r.output;
    callCount += r.count;
    estimatedCostUsd += (r.input / 1_000_000) * price.input + (r.output / 1_000_000) * price.output;
  }

  return { totalInputTokens, totalOutputTokens, estimatedCostUsd, callCount };
}
