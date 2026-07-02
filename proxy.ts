/**
 * Proxy (Next.js 16 — thay cho middleware). Chặn mọi route trừ trang đăng nhập:
 * chưa đăng nhập → về /login; đã đăng nhập mà vào /login → về trang chủ.
 *
 * Chỉ đọc/kiểm cookie phiên (optimistic check) — nhẹ, chạy trên mọi route.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/token";
import { SESSION_COOKIE } from "@/lib/auth/config";

const PUBLIC_PATHS = ["/login"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const session = verifyToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Bỏ qua API, tài nguyên nội bộ (_next) và file tĩnh (đường dẫn có dấu chấm,
  // gồm ảnh upload trong /uploads/*.png và favicon.ico).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
