/**
 * Nav — single source of truth cho điều hướng app.
 * Dùng chung bởi sidebar (components/shell/app-sidebar.tsx) và dashboard cards (app/page.tsx)
 * để hai nơi không bao giờ lệch nhau.
 */
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Calendar,
  Images,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  /** Nhãn ngắn hiển thị ở sidebar + tiêu đề trang. */
  label: string;
  /** Mô tả ngắn cho dashboard card. */
  desc: string;
  /** Text CTA cho dashboard card. */
  cta: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tổng quan", desc: "Số liệu & điều hướng nhanh", cta: "Mở dashboard →", icon: LayoutDashboard },
  { href: "/ideas", label: "Ý tưởng & Caption", desc: "Sinh nội dung bằng AI", cta: "Bắt đầu sinh →", icon: Lightbulb },
  { href: "/posts", label: "Nội dung", desc: "Xem mọi caption & bản nháp", cta: "Xem nội dung →", icon: FileText },
  { href: "/calendar", label: "Lịch nội dung", desc: "Xếp lịch đăng theo nền tảng", cta: "Xem lịch →", icon: Calendar },
  { href: "/assets", label: "Thư viện ảnh", desc: "Upload ảnh, gắn vào bài", cta: "Mở thư viện →", icon: Images },
  { href: "/settings", label: "Cài đặt", desc: "Kiểm tra API key", cta: "Mở cài đặt →", icon: Settings },
];

/**
 * Tìm tiêu đề trang theo pathname.
 * Khớp chính xác trước; nếu không, khớp tiền tố dài nhất (vd /editor/123 → không khớp, trả "").
 * "/" chỉ khớp chính xác để tránh nuốt mọi route.
 */
export function titleForPath(pathname: string): string {
  const exact = NAV_ITEMS.find((n) => n.href === pathname);
  if (exact) return exact.label;

  const prefix = NAV_ITEMS.filter((n) => n.href !== "/")
    .filter((n) => pathname.startsWith(n.href + "/") || pathname === n.href)
    .sort((a, b) => b.href.length - a.href.length)[0];

  return prefix?.label ?? "";
}

/** Item nào đang active theo pathname (dùng cho highlight ở sidebar). */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
