/**
 * Cấu hình đăng nhập (single-admin gate).
 *
 * Mặc định admin/admin để chạy local ngay không cần cấu hình. Khi deploy nên
 * đặt AUTH_USERNAME/AUTH_PASSWORD/SESSION_SECRET trong biến môi trường để
 * KHÔNG phải commit mật khẩu thật vào repo (chống lộ dữ liệu).
 */

// Thông tin đăng nhập — env đè giá trị mặc định.
export const AUTH_USERNAME = process.env.AUTH_USERNAME ?? "admin";
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "admin";

// Khóa ký cookie phiên (HMAC-SHA256). Bắt buộc đặt khi deploy public.
export const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-insecure-session-secret-change-me";

// Tên cookie + thời hạn phiên (giây) = 7 ngày.
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
