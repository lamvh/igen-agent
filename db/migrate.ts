/**
 * Chạy migration Drizzle lên SQLite.
 * Tạo file local.db + bảng theo dõi migration; áp dụng mọi migration trong ./drizzle.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";

const dbUrl = process.env.DATABASE_URL ?? "file:./local.db";
const dbPath = dbUrl.replace(/^file:/, "");

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();

console.log(`Migration hoàn tất → ${dbPath}`);
