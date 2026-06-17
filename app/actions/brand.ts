"use server";

/**
 * Server actions cho Brand Profile (single-brand v1).
 * - getBrand: lấy brand đầu tiên (hoặc null nếu chưa tạo).
 * - upsertBrand: tạo nếu chưa có, ngược lại cập nhật theo id. Tương thích useActionState.
 */
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brand, type Brand } from "@/db/schema";
import { brandSchema } from "@/lib/validations/brand";
import { parseJsonArray, serializeJsonArray } from "@/lib/json";

export type BrandView = Omit<Brand, "pillars"> & { pillars: string[] };

export type BrandFormState = {
  success: boolean;
  message: string;
  errors: Record<string, string[]>;
};

/** Lấy brand hiện có (single-row pattern); null nếu chưa thiết lập. */
export async function getBrand(): Promise<BrandView | null> {
  const rows = await db.select().from(brand).orderBy(asc(brand.id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, pillars: parseJsonArray<string>(row.pillars) };
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
  const values = {
    name: data.name,
    industry: data.industry,
    products: data.products,
    toneOfVoice: data.toneOfVoice,
    audience: data.audience,
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
  return { success: true, message: "Đã lưu brand profile.", errors: {} };
}
