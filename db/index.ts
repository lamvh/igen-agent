/**
 * Khởi tạo Drizzle client trên libSQL (Turso).
 * Dùng chung cho server actions toàn app.
 *
 * - Local dev: DATABASE_URL = "file:./local.db" (không cần authToken).
 * - Vercel/Turso: DATABASE_URL = "libsql://<db>.turso.io" + TURSO_AUTH_TOKEN.
 *   libSQL serverless tương thích SQLite nên schema giữ nguyên.
 */
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Dùng `||` (không phải `??`) để chuỗi rỗng "" cũng fallback về file local,
// tránh bẫy: URL rỗng khiến isRemote=false → isDbAvailable=false → data trống thầm lặng.
const DATABASE_URL = process.env.DATABASE_URL || "file:./local.db";

// URL remote (Turso) mới dùng được trên serverless; "file:" chỉ chạy local.
const isRemote = /^(libsql|https?|wss?):/.test(DATABASE_URL);

/**
 * DB có dùng được không. Trên Vercel (FS read-only) mà chưa cấu hình Turso
 * thì file SQLite không ghi được → coi như chưa kết nối, để app degrade
 * gracefully thay vì 500. Local vẫn dùng file bình thường.
 */
export const isDbAvailable = isRemote || !process.env.VERCEL;

const client = createClient({
  url: DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

/**
 * Bọc một truy vấn đọc: trả `fallback` khi DB chưa kết nối hoặc query lỗi,
 * để Server Component render empty-state thay vì ném lỗi → 500.
 * CHỈ dùng cho READ (ghi vẫn phải báo lỗi rõ cho người dùng).
 */
export async function safeRead<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!isDbAvailable) return fallback;
  try {
    return await run();
  } catch (err) {
    console.error("[db] read failed, trả fallback:", err);
    return fallback;
  }
}
