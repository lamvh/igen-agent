"use client";

/**
 * Error boundary cấp route — backstop cuối cùng để mọi lỗi không xử lý
 * (vd DB chưa kết nối trên serverless) hiện thông báo thân thiện thay vì 500.
 */
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Đã có lỗi xảy ra</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Không tải được dữ liệu. Nếu vừa deploy, hãy kiểm tra đã cấu hình{" "}
        <code className="rounded bg-muted px-1 py-0.5">DATABASE_URL</code> và{" "}
        <code className="rounded bg-muted px-1 py-0.5">TURSO_AUTH_TOKEN</code> chưa.
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
