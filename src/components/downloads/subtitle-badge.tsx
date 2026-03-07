"use client";

import { Subtitles } from "lucide-react";
import type { SubtitleStatus, SubtitleTrack } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const config: Record<SubtitleStatus, { label: string; className: string } | null> = {
  confirmed: { label: "CC", className: "text-green-400" },
  likely: { label: "CC", className: "text-yellow-400" },
  unlikely: { label: "CC", className: "text-muted-foreground/40 line-through" },
  none: { label: "CC", className: "text-muted-foreground/30" },
  unknown: null,
};

export function SubtitleBadge({
  status,
  tracks,
  size = "sm",
}: {
  status?: SubtitleStatus;
  tracks?: SubtitleTrack[];
  size?: "sm" | "xs";
}) {
  if (!status || !config[status]) return null;
  const { label, className } = config[status]!;

  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";

  const tooltipText = getTooltipText(status, tracks);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 ${className} ${textSize} cursor-default`}>
            <Subtitles className={iconSize} />
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTooltipText(status: SubtitleStatus, tracks?: SubtitleTrack[]): string {
  if (status === "confirmed" && tracks && tracks.length > 0) {
    const langs = tracks.map((t) => {
      let s = t.language || "unknown";
      if (t.title) s += ` (${t.title})`;
      if (t.forced) s += " [forced]";
      return s;
    });
    return `Embedded subs: ${langs.join(", ")}`;
  }

  switch (status) {
    case "confirmed": return "Embedded subtitles confirmed";
    case "likely": return "Likely has embedded subtitles";
    case "unlikely": return "Unlikely to have embedded subtitles";
    case "none": return "No embedded subtitles";
    default: return "Subtitle status unknown";
  }
}
