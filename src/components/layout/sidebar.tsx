"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Plus, Cloud, FolderOpen, Settings, Vault } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Downloads", icon: Download },
  { href: "/add", label: "Add Download", icon: Plus },
  { href: "/cloud", label: "RD Cloud", icon: Cloud },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <Vault className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Debrid Vault</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
