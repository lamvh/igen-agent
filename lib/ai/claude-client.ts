/**
 * Khởi tạo Anthropic SDK client (server-only).
 * API key đọc từ env runtime (ANTHROPIC_API_KEY) — KHÔNG bao giờ gọi client-side.
 * Model: claude-opus-4-8 (Opus) — ưu tiên chất lượng cho sinh ý tưởng + caption.
 *
 * Lưu ý Opus 4.8: chỉ adaptive thinking; không dùng temperature/top_p/budget_tokens.
 * Điều chỉnh độ sâu suy luận qua output_config.effort.
 */
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-4-8";

/** Có cấu hình API key hay chưa (dùng để degrade gracefully ở UI/action). */
export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cached: Anthropic | null = null;

/** Lấy client; throw rõ ràng nếu thiếu key để action bắt và trả lỗi thân thiện. */
export function getClaudeClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Thiếu ANTHROPIC_API_KEY — không thể gọi Claude API.");
  }
  if (!cached) {
    cached = new Anthropic();
  }
  return cached;
}
