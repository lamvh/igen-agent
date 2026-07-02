"use server";

/**
 * Server actions cho đăng nhập/đăng xuất. Kiểm thông tin ở server rồi tạo/xóa
 * cookie phiên. Mật khẩu không bao giờ ra client.
 */
import { redirect } from "next/navigation";
import { AUTH_USERNAME, AUTH_PASSWORD } from "@/lib/auth/config";
import { createSession, deleteSession } from "@/lib/auth/session";

export type LoginState = { error?: string } | undefined;

/** Kiểm thông tin đăng nhập; đúng thì tạo phiên + chuyển về trang chủ. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return { error: "Sai tên đăng nhập hoặc mật khẩu." };
  }

  await createSession(username);
  // redirect() ném để chuyển hướng — phải nằm ngoài try/catch.
  redirect("/");
}

/** Đăng xuất: xóa phiên rồi về trang đăng nhập. */
export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
