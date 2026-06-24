"use client";

/**
 * AppSidebar — danh sách điều hướng dùng chung.
 * Tách riêng phần render link để dùng lại cả ở rail desktop lẫn dialog mobile.
 * Active state tính từ usePathname().
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-linear-to-r from-sidebar-accent to-sidebar-accent/40 text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            {/* Thanh chỉ báo bên trái khi active. */}
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3 py-1">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30">
        <Sparkles className="size-4" />
      </span>
      <span className="font-heading text-sm font-semibold tracking-tight">Content Creator</span>
    </Link>
  );
}

/** Rail cố định cho desktop (ẩn dưới md). */
export function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-2">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <NavLinks />
      </div>
    </aside>
  );
}

/** Nội dung nav dùng trong dialog mobile. */
export function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinks onNavigate={onNavigate} />;
}
