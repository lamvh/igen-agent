/**
 * Trang Brand Profile (/brand) — Server Component.
 * Lấy brand hiện có (single-row) rồi render form CRUD client.
 */
import { getBrand } from "@/app/actions/brand";
import { BrandForm } from "./brand-form";

export const metadata = {
  title: "Brand Profile",
};

// Đọc brand từ DB lúc request.
export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const brand = await getBrand();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <p className="mb-8 text-sm text-muted-foreground">
        {brand
          ? "Cập nhật thông tin thương hiệu — dùng làm ngữ cảnh cho sinh nội dung."
          : "Thiết lập thương hiệu của bạn để bắt đầu."}
      </p>
      <BrandForm brand={brand} />
    </div>
  );
}
