/**
 * /brand — đã gộp vào Cài đặt. Redirect sang tab Thương hiệu trong /settings.
 * Giữ route để link/bookmark cũ không gãy.
 */
import { redirect } from "next/navigation";

export default function BrandPage() {
  redirect("/settings?tab=brand");
}
