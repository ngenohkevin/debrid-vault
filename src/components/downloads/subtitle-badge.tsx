"use client";

import { Subtitles } from "lucide-react";
import type { SubtitleStatus } from "@/lib/types";

const config: Record<SubtitleStatus, { label: string; className: string } | null> = {
  confirmed: { label: "Subs", className: "text-green-400" },
  likely: { label: "Subs likely", className: "text-yellow-400" },
  unlikely: { label: "No subs", className: "text-muted-foreground/40" },
  none: { label: "No subs", className: "text-muted-foreground/30" },
  unknown: null,
};

export function SubtitleBadge({
  status,
  size = "sm",
}: {
  status?: SubtitleStatus;
  size?: "sm" | "xs";
}) {
  if (!status || !config[status]) return null;
  const { label, className } = config[status]!;

  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";

  return (
    <span className={`inline-flex items-center gap-0.5 ${className} ${textSize}`}>
      <Subtitles className={iconSize} />
      {label}
    </span>
  );
}
