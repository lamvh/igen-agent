/**
 * Chạy migration Drizzle lên libSQL (Turso) hoặc file SQLite local.
 * Áp dụng mọi migration trong ./drizzle.
 *
 * - Local: DATABASE_URL = "file:./local.db".
 * - Turso: DATABASE_URL = "libsql://<db>.turso.io" + TURSO_AUTH_TOKEN.
 */
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";

// Load .env.local giống Next.js dev — nếu không, script chạy bằng tsx sẽ không thấy
// DATABASE_URL và migrate nhầm vào file local.db trong khi app dùng DB khác.
// Tham số dev=true: @next/env mặc định mode production (sẽ đọc .env.production.local).
loadEnvConfig(process.cwd(), true);

// Cùng logic `||` với db/index.ts: chuỗi rỗng cũng fallback về file local.
const dbUrl = process.env.DATABASE_URL || "file:./local.db";

// Gói trong hàm async — tsx chạy CJS không hỗ trợ top-level await.
async function main() {
  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  client.close();

  console.log(`Migration hoàn tất → ${dbUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
