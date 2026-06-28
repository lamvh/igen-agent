/**
 * Chạy migration Drizzle lên libSQL (Turso) hoặc file SQLite local.
 * Áp dụng mọi migration trong ./drizzle.
 *
 * - Local: DATABASE_URL = "file:./local.db".
 * - Turso: DATABASE_URL = "libsql://<db>.turso.io" + TURSO_AUTH_TOKEN.
 */
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL ?? "file:./local.db";

const client = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
client.close();

console.log(`Migration hoàn tất → ${dbUrl}`);
