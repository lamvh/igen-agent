/**
 * Drizzle schema cho Content Creator Web App (SQLite).
 *
 * 4 bảng lõi: brand, idea, post, asset. Khai báo đầy đủ ngay từ Phase 2
 * để chỉ migrate một lần; Phase 2 chỉ dùng UI cho `brand`.
 *
 * SQLite không có kiểu mảng/JSON native → các trường danh sách
 * (pillars, hashtags, assetIds) lưu dạng JSON text; serialize/parse
 * tập trung ở lib/json.ts.
 */
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// platform: 'facebook' | 'instagram' | 'tiktok' (text + check ở tầng app)
// post.status: 'draft' | 'scheduled' | 'posted'
// idea.status: dùng từ Phase 3

export const brand = sqliteTable("brand", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  products: text("products").notNull().default(""),
  toneOfVoice: text("tone_of_voice").notNull().default(""),
  audience: text("audience").notNull().default(""),
  pillars: text("pillars").notNull().default("[]"), // JSON text: string[]
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const idea = sqliteTable("idea", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandId: integer("brand_id")
    .notNull()
    .references(() => brand.id),
  title: text("title").notNull(),
  // Dàn ý chi tiết triển khai từ title (bước 2 của quy trình); null nếu chưa tạo.
  outline: text("outline"),
  pillar: text("pillar"),
  platform: text("platform"), // 'facebook' | 'instagram' | 'tiktok'
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const post = sqliteTable("post", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ideaId: integer("idea_id").references(() => idea.id),
  platform: text("platform").notNull(), // 'facebook' | 'instagram' | 'tiktok'
  caption: text("caption").notNull().default(""),
  hashtags: text("hashtags").notNull().default("[]"), // JSON text: string[]
  scheduledDate: integer("scheduled_date", { mode: "timestamp" }),
  status: text("status").notNull().default("draft"), // draft | scheduled | posted
  assetIds: text("asset_ids").notNull().default("[]"), // JSON text: number[]
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const asset = sqliteTable("asset", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'image' | ... (mở rộng sau)
  path: text("path").notNull(),
  prompt: text("prompt"),
  postId: integer("post_id").references(() => post.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Brand = typeof brand.$inferSelect;
export type NewBrand = typeof brand.$inferInsert;
export type Idea = typeof idea.$inferSelect;
export type Post = typeof post.$inferSelect;
export type Asset = typeof asset.$inferSelect;
