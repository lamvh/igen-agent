"use client";

/**
 * AppShell — bố cục chung cho mọi trang.
 * Desktop: rail trái cố định + vùng nội dung có strip tiêu đề.
 * Mobile: top bar có hamburger mở nav trong Dialog.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { DesktopSidebar, MobileNav } from "@/components/shell/app-sidebar";
import { titleForPath } from "@/lib/nav";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-background">
      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header strip: hamburger (mobile) + tiêu đề trang hiện tại. */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/60">
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
