import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner xoay nhỏ — dùng trong nút/overlay khi đang chờ tác vụ async. */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}
