"use client";

/**
 * Nút đăng xuất — form gọi server action `logout` (xóa cookie phiên).
 */
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      >
        <LogOut className="size-4 shrink-0" />
        <span className="truncate">Đăng xuất</span>
      </Button>
    </form>
  );
}
