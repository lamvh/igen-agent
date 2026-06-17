/**
 * Khởi tạo Drizzle client trên SQLite (better-sqlite3).
 * Dùng chung cho server actions toàn app.
 */
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL ?? "file:./local.db";
// Bỏ tiền tố "file:" nếu có để lấy đường dẫn file thật.
const dbPath = dbUrl.replace(/^file:/, "");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
