"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Plus, Cloud, FolderOpen, Settings, CalendarClock, Music2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Downloads", icon: Download },
  { href: "/add", label: "Add Download", icon: Plus },
  { href: "/music", label: "Music", icon: Music2 },
  { href: "/cloud", label: "Cloud", icon: Cloud },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/library", label: "Library", icon: FolderOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const isSettingsActive = pathname === "/settings";

  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 flex-col border-r border-border-card bg-surface-primary h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border-card">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700">
          <Shield className="h-4 w-4 text-white" fill="currentColor" />
        </div>
        <span className="font-semibold text-[13px] text-fg-primary">Debrid Vault</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
                isActive
                  ? "bg-accent-blue text-white font-medium"
                  : "text-fg-secondary hover:bg-surface-secondary hover:text-fg-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 pb-4 space-y-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors",
            isSettingsActive
              ? "bg-surface-secondary text-fg-primary font-medium"
              : "text-fg-muted hover:bg-surface-secondary hover:text-fg-secondary"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <p className="px-3 text-[10px] text-fg-muted font-mono">Debrid Vault v2.0</p>
      </div>
    </aside>
  );
}
