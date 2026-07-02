/**
 * Quản lý phiên qua cookie (server-only). Bọc next/headers + token HMAC.
 */
import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken, type SessionPayload } from "./token";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./config";

/** Tạo cookie phiên đã ký cho người dùng. */
export async function createSession(user: string): Promise<void> {
  const token = signToken({ user, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/** Xóa cookie phiên (đăng xuất). */
export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Đọc phiên hiện tại từ cookie; null nếu chưa đăng nhập/không hợp lệ. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
