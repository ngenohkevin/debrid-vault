"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Plus, Cloud, FolderOpen, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Downloads", icon: Download },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/music", label: "Music", icon: Music2 },
  { href: "/cloud", label: "Cloud", icon: Cloud },
  { href: "/library", label: "Library", icon: FolderOpen },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-card bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/80 md:hidden safe-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-2.5 min-w-[44px] min-h-[44px] justify-center transition-colors",
                isActive ? "text-accent-blue font-semibold" : "text-fg-muted hover:text-fg-secondary"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
