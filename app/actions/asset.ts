"use server";

/**
 * Server actions cho Asset Library (upload ảnh thủ công, local-first).
 * - uploadAsset: ghi file vào public/uploads/, tạo asset row.
 * - listAssets / getAssetsByIds: đọc thư viện / ảnh của 1 post.
 * - attachAssetToPost: gắn asset vào post.assetIds (JSON number[]).
 *
 * Lưu ý deploy: public/uploads không bền trên serverless → chuyển object storage ở Phase 6.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { asset, post, type Asset } from "@/db/schema";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadState = { success: boolean; message: string };

/** Upload 1 ảnh. useActionState: (prev, formData) với field name="file". */
export async function uploadAsset(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Chưa chọn ảnh." };
  }
  if (!ALLOWED.has(file.type)) {
    return { success: false, message: "Chỉ chấp nhận PNG/JPG/WebP/GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, message: "Ảnh vượt 5MB." };
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${EXT[file.type]}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);

    await db.insert(asset).values({ type: "image", path: `/uploads/${filename}` });
  } catch {
    return { success: false, message: "Upload thất bại, vui lòng thử lại." };
  }

  revalidatePath("/assets");
  return { success: true, message: "Đã tải ảnh lên." };
}

/** Toàn bộ asset (mới nhất trước). */
export async function listAssets(): Promise<Asset[]> {
  return db.select().from(asset).orderBy(desc(asset.id));
}

/** Asset theo danh sách id (giữ thứ tự đầu vào). */
export async function getAssetsByIds(ids: number[]): Promise<Asset[]> {
  if (!ids.length) return [];
  const rows = await db.select().from(asset).where(inArray(asset.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a));
}

/**
 * Xóa 1 ảnh: gỡ id khỏi mọi post đang dùng, xóa record DB, rồi xóa file vật lý.
 * Xóa file đặt cuối + bỏ qua lỗi unlink (file có thể đã mất) để DB vẫn sạch.
 */
export async function deleteAsset(assetId: number): Promise<UploadState> {
  if (!Number.isInteger(assetId) || assetId <= 0) {
    return { success: false, message: "Ảnh không hợp lệ." };
  }

  let filePath: string | null = null;
  try {
    const rows = await db.select({ path: asset.path }).from(asset).where(eq(asset.id, assetId)).limit(1);
    if (!rows[0]) return { success: false, message: "Không tìm thấy ảnh." };
    filePath = rows[0].path;

    // Gỡ assetId khỏi các post tham chiếu (assetIds là JSON number[] nên lọc trong app).
    const usingPosts = await db.select({ id: post.id, assetIds: post.assetIds }).from(post);
    db.transaction((tx) => {
      for (const p of usingPosts) {
        const ids = parseJsonArray<number>(p.assetIds);
        if (ids.includes(assetId)) {
          tx.update(post)
            .set({ assetIds: serializeJsonArray(ids.filter((x) => x !== assetId)) })
            .where(eq(post.id, p.id))
            .run();
        }
      }
      tx.delete(asset).where(eq(asset.id, assetId)).run();
    });
  } catch {
    return { success: false, message: "Xóa ảnh thất bại, vui lòng thử lại." };
  }

  // Xóa file trong public/uploads; bỏ qua nếu file không tồn tại.
  if (filePath?.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", filePath));
    } catch {
      /* file đã mất — không sao, DB đã sạch */
    }
  }

  revalidatePath("/assets");
  return { success: true, message: "Đã xóa ảnh." };
}

/** Gắn/bỏ gắn asset vào post.assetIds (toggle). */
export async function attachAssetToPost(postId: number, assetId: number): Promise<UploadState> {
  if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(assetId) || assetId <= 0) {
    return { success: false, message: "Tham số không hợp lệ." };
  }
  try {
    const rows = await db.select({ assetIds: post.assetIds }).from(post).where(eq(post.id, postId)).limit(1);
    if (!rows[0]) return { success: false, message: "Không tìm thấy post." };

    const current = parseJsonArray<number>(rows[0].assetIds);
    const next = current.includes(assetId)
      ? current.filter((x) => x !== assetId)
      : [...current, assetId];

    await db.update(post).set({ assetIds: serializeJsonArray(next) }).where(eq(post.id, postId));
  } catch {
    return { success: false, message: "Gắn ảnh thất bại." };
  }

  revalidatePath(`/editor/${postId}`);
  revalidatePath("/calendar");
  return { success: true, message: "Đã cập nhật ảnh của post." };
}
