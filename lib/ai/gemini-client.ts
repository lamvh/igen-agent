/**
 * Stub sinh ảnh AI (Gemini / Nano Banana) — server-only.
 * v1 CHƯA tích hợp: gate theo GEMINI_API_KEY. Thiếu key → throw có hướng dẫn.
 * Khi có key, triển khai generateImage thật (skill ai-multimodal/ai-artist).
 */

/** Đã cấu hình GEMINI_API_KEY chưa (để disable nút sinh AI ở UI). */
export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Sinh ảnh từ prompt. Hiện là stub: chỉ chạy khi có key.
 * @throws nếu thiếu key hoặc chưa triển khai.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- prompt sẽ dùng khi triển khai
export async function generateImage(prompt: string): Promise<{ path: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Thiếu GEMINI_API_KEY. Lấy key tại https://aistudio.google.com rồi thêm vào .env.local.",
    );
  }
  // TODO(Phase sau): gọi Gemini/Nano Banana, lưu ảnh vào public/uploads/, trả path.
  throw new Error("Sinh ảnh AI chưa được triển khai trong phiên bản này.");
}
