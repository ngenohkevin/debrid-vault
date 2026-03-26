"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-[22px] font-bold text-fg-primary">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        <Link
          href="/settings"
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-secondary transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
