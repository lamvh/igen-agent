"use server";

/**
 * Server actions cho Settings: kiểm tra trạng thái + test API key.
 * Key đọc từ env runtime; chỉ test ở server (không lộ key ra client).
 */
import { getClaudeClient, hasApiKey, CLAUDE_MODEL } from "@/lib/ai/claude-client";
import { hasGeminiKey } from "@/lib/ai/gemini-client";

export type KeyStatus = {
  anthropic: boolean;
  gemini: boolean;
};

/** Trạng thái cấu hình key (không gọi API). */
export async function getKeyStatus(): Promise<KeyStatus> {
  return { anthropic: hasApiKey(), gemini: hasGeminiKey() };
}

export type TestResult = { success: boolean; message: string };

/** Test ANTHROPIC_API_KEY bằng 1 lời gọi nhỏ (max_tokens thấp để tiết kiệm). */
export async function testClaudeKey(): Promise<TestResult> {
  if (!hasApiKey()) {
    return { success: false, message: "Chưa cấu hình ANTHROPIC_API_KEY." };
  }
  try {
    const client = getClaudeClient();
    await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8,
      messages: [{ role: "user", content: "ping" }],
    });
    return { success: true, message: "Claude API hoạt động." };
  } catch (err) {
    // Phân biệt key sai (401/403) với lỗi tạm thời (429/5xx) để báo đúng.
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return { success: false, message: "Key không hợp lệ — kiểm tra lại ANTHROPIC_API_KEY." };
    }
    if (status === 429 || (typeof status === "number" && status >= 500)) {
      return { success: false, message: "Claude tạm thời quá tải/giới hạn — thử lại sau." };
    }
    return { success: false, message: "Gọi Claude thất bại — kiểm tra kết nối và key." };
  }
}
