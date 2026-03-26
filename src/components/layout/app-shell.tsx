"use client";

import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh overflow-x-hidden bg-surface-primary">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0 overflow-x-hidden">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
