import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * Trang đăng nhập. Nếu đã có phiên hợp lệ thì chuyển thẳng về trang chủ
 * (proxy cũng chặn, đây là lớp phòng thủ thứ hai).
 */
export default async function LoginPage() {
  if (await getSession()) {
    redirect("/");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight">Content Creator</h1>
            <p className="text-sm text-muted-foreground">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
