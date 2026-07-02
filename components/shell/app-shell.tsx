"use client";

/**
 * AppShell — bố cục chung cho mọi trang.
 * Desktop: rail trái cố định + vùng nội dung có strip tiêu đề.
 * Mobile: top bar có hamburger mở nav trong Dialog.
 */
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft, Sparkles } from "lucide-react";
import { DesktopSidebar, MobileNav } from "@/components/shell/app-sidebar";
import { titleForPath } from "@/lib/nav";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SIDEBAR_HIDDEN_KEY = "sidebar-hidden";

// Store ngoài React cho trạng thái ẩn rail — đọc localStorage hydrate-safe
// qua useSyncExternalStore (server trả false, client đồng bộ sau mount).
const sidebarStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  },
  getSnapshot: () => localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1",
  getServerSnapshot: () => false,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Ẩn/hiện rail desktop; khôi phục lựa chọn từ localStorage.
  const desktopHidden = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot,
  );

  function toggleDesktop() {
    const next = !desktopHidden;
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, next ? "1" : "0");
    // storage event không tự phát trong cùng tab → bắn thủ công để re-render.
    window.dispatchEvent(new StorageEvent("storage"));
  }

  // Trang đăng nhập nằm ngoài app: bỏ chrome (rail + header), render toàn màn.
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <DesktopSidebar hidden={desktopHidden} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header strip: hamburger (mobile) + tiêu đề trang hiện tại. */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/60">
          {/* Ẩn/hiện rail desktop (md trở lên). */}
          <Button
            variant="outline"
            size="icon"
            className="hidden md:inline-flex"
            onClick={toggleDesktop}
            aria-label={desktopHidden ? "Hiện thanh điều hướng" : "Ẩn thanh điều hướng"}
            aria-pressed={desktopHidden}
          >
            <PanelLeft />
          </Button>

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Mở menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-4 left-4 max-w-[16rem] translate-x-0 translate-y-0">
              <DialogTitle className="flex items-center gap-2 px-1">
                <Sparkles className="size-4" />
                Content Creator
              </DialogTitle>
              <div className="mt-2">
                <MobileNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>

          <h1 className="font-heading truncate text-base font-semibold tracking-tight">
            {title}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
