"use server";

/**
 * Server actions cho Brand Profile (single-brand v1).
 * - getBrand: lấy brand đầu tiên (hoặc null nếu chưa tạo).
 * - upsertBrand: tạo nếu chưa có, ngược lại cập nhật theo id. Tương thích useActionState.
 */
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, safeRead } from "@/db";
import { brand, idea, type Brand } from "@/db/schema";
import { brandSchema } from "@/lib/validations/brand";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";

export type BrandView = Omit<Brand, "pillars" | "tags"> & { pillars: string[]; tags: string[] };

export type BrandFormState = {
  success: boolean;
  message: string;
  errors: Record<string, string[]>;
};

/** Lấy brand hiện có (single-row pattern); null nếu chưa thiết lập. */
export async function getBrand(): Promise<BrandView | null> {
  return safeRead(async () => {
    const rows = await db.select().from(brand).orderBy(asc(brand.id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      pillars: parseJsonArray<string>(row.pillars),
      tags: parseJsonArray<string>(row.tags),
    };
  }, null);
}

/** Tạo/cập nhật brand. Dùng làm action cho useActionState: (prevState, formData). */
export async function upsertBrand(
  _prevState: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const pillars = formData
    .getAll("pillar")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  const parsed = brandSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    products: formData.get("products") ?? "",
    toneOfVoice: formData.get("toneOfVoice") ?? "",
    audience: formData.get("audience") ?? "",
    guidelines: formData.get("guidelines") ?? "",
    imagePromptRules: formData.get("imagePromptRules") ?? "",
    pillars,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại các trường bị lỗi.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  // Không đụng tới `tags` ở đây — tag được quản lý riêng qua addBrandTag/removeBrandTag
  // (tab Tag phân loại), nên lưu brand không ghi đè danh sách tag hiện có.
  const values = {
    name: data.name,
    industry: data.industry,
    products: data.products,
    toneOfVoice: data.toneOfVoice,
    audience: data.audience,
    guidelines: data.guidelines,
    imagePromptRules: data.imagePromptRules,
    pillars: serializeJsonArray(data.pillars),
  };

  try {
    const existing = await db.select({ id: brand.id }).from(brand).orderBy(asc(brand.id)).limit(1);

    if (existing[0]) {
      await db.update(brand).set(values).where(eq(brand.id, existing[0].id));
    } else {
      await db.insert(brand).values(values);
    }
  } catch {
    return { success: false, message: "Lưu thất bại, vui lòng thử lại.", errors: {} };
  }

  revalidatePath("/brand");
  revalidatePath("/settings");
  return { success: true, message: "Đã lưu brand profile.", errors: {} };
}

export type TagListResult = { success: boolean; message: string; tags: string[] };

/** Lấy brand row đầu tiên + danh sách tags đã parse; null nếu chưa có brand. */
async function getBrandWithTags(): Promise<{ id: number; tags: string[] } | null> {
  const rows = await db.select({ id: brand.id, tags: brand.tags }).from(brand).orderBy(asc(brand.id)).limit(1);
  if (!rows[0]) return null;
  return { id: rows[0].id, tags: parseJsonArray<string>(rows[0].tags) };
}

/** Thêm 1 tag vào danh sách tag chung của brand (trùng thì bỏ qua). Trả danh sách mới. */
export async function addBrandTag(name: string): Promise<TagListResult> {
  const tag = name.trim();
  if (!tag) return { success: false, message: "Tên tag không được trống.", tags: [] };

  const b = await getBrandWithTags();
  if (!b) return { success: false, message: "Cần thiết lập Brand Profile trước.", tags: [] };

  // So sánh không phân biệt hoa thường để tránh tag trùng.
  if (b.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
    return { success: false, message: "Tag đã tồn tại.", tags: b.tags };
  }

  const next = [...b.tags, tag];
  try {
    await db.update(brand).set({ tags: serializeJsonArray(next) }).where(eq(brand.id, b.id));
  } catch {
    return { success: false, message: "Thêm tag thất bại.", tags: b.tags };
  }
  revalidatePath("/ideas");
  revalidatePath("/settings");
  return { success: true, message: "Đã thêm tag.", tags: next };
}

/**
 * Xóa 1 tag khỏi danh sách chung của brand VÀ gỡ tag đó khỏi mọi ý tưởng đang dùng.
 * Trả danh sách tag mới của brand.
 */
export async function removeBrandTag(name: string): Promise<TagListResult> {
  const tag = name.trim();
  if (!tag) return { success: false, message: "Tag không hợp lệ.", tags: [] };

  const b = await getBrandWithTags();
  if (!b) return { success: false, message: "Cần thiết lập Brand Profile trước.", tags: [] };

  const next = b.tags.filter((t) => t !== tag);
  try {
    await db.transaction(async (tx) => {
      await tx.update(brand).set({ tags: serializeJsonArray(next) }).where(eq(brand.id, b.id));
      // Gỡ tag khỏi mọi idea đang dùng (tránh tag mồ côi).
      const ideaRows = await tx.select({ id: idea.id, tags: idea.tags }).from(idea);
      for (const r of ideaRows) {
        const ideaTags = parseJsonArray<string>(r.tags);
        if (ideaTags.includes(tag)) {
          await tx
            .update(idea)
            .set({ tags: serializeJsonArray(ideaTags.filter((t) => t !== tag)) })
            .where(eq(idea.id, r.id));
        }
      }
    });
  } catch {
    return { success: false, message: "Xóa tag thất bại.", tags: b.tags };
  }
  revalidatePath("/ideas");
  revalidatePath("/settings");
  return { success: true, message: "Đã xóa tag.", tags: next };
}
