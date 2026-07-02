/**
 * Ký/kiểm cookie phiên bằng HMAC-SHA256 (node:crypto — có sẵn, không thêm dep).
 * Định dạng token: base64url(payload) + "." + base64url(chữ ký).
 *
 * Module thuần (không dùng next/headers) nên dùng được cả trong proxy.ts lẫn
 * server component/action.
 */
import crypto from "node:crypto";
import { SESSION_SECRET } from "./config";

export type SessionPayload = {
  user: string;
  exp: number; // hết hạn — epoch millis
};

function sign(data: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

/** Tạo token đã ký từ payload. */
export function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Kiểm token: chữ ký hợp lệ + chưa hết hạn. Trả null nếu không hợp lệ. */
export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  // So sánh chữ ký kiểu constant-time để tránh rò rỉ qua thời gian.
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
