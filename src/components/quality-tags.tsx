"use client";

import { Subtitles } from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityTag {
  label: string;
  type: "quality" | "hires" | "codec" | "subtitle";
}

export function parseQualityTags(name: string): QualityTag[] {
  const tags: QualityTag[] = [];

  // Resolution / quality
  if (/2160[pP]|4K|UHD/i.test(name)) tags.push({ label: "4K", type: "quality" });
  if (/HDR10\+/i.test(name)) tags.push({ label: "HDR10+", type: "quality" });
  else if (/HDR/i.test(name)) tags.push({ label: "HDR", type: "quality" });
  if (/DV|DOLBY.?VISION/i.test(name)) tags.push({ label: "DV", type: "quality" });

  // Codec
  if (/REMUX/i.test(name)) tags.push({ label: "REMUX", type: "codec" });
  if (/HEVC|[Hh]\.?265|x265/i.test(name)) tags.push({ label: "HEVC", type: "codec" });
  if (/ATMOS/i.test(name)) tags.push({ label: "Atmos", type: "codec" });
  else if (/DTS[.-]?HD/i.test(name)) tags.push({ label: "DTS-HD", type: "codec" });
  else if (/5\.1|7\.1/i.test(name)) {
    const match = name.match(/(5\.1|7\.1)/);
    if (match) tags.push({ label: match[1], type: "codec" });
  }

  return tags;
}

export function QualityTagBadge({ tag }: { tag: QualityTag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-medium font-mono",
        tag.type === "quality" && "bg-tag-quality-bg text-accent-amber",
        tag.type === "hires" && "bg-tag-hires-bg text-accent-green",
        tag.type === "codec" && "bg-surface-primary text-fg-muted",
        tag.type === "subtitle" && "bg-surface-primary text-fg-muted"
      )}
    >
      {tag.label}
    </span>
  );
}

export function QualityTags({ name, className }: { name: string; className?: string }) {
  const tags = parseQualityTags(name);
  if (tags.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {tags.map((tag, i) => (
        <QualityTagBadge key={i} tag={tag} />
      ))}
    </div>
  );
}

export function SubtitleTag({ languages }: { languages?: string }) {
  if (!languages) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-surface-primary text-fg-muted">
      <Subtitles className="h-2.5 w-2.5" />
      {languages}
    </span>
  );
}

export function HiResBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-tag-hires-bg text-accent-green">
      Hi-Res
    </span>
  );
}

export function AudioQualityBadge({ bitDepth, sampleRate }: { bitDepth: number; sampleRate: number }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-tag-quality-bg text-accent-amber font-mono">
      {bitDepth}bit/{sampleRate}kHz
    </span>
  );
}

export function AudioModeBadges({ modes, mediaTags }: { modes?: string[]; mediaTags?: string[] }) {
  const badges: { label: string; type: "quality" | "hires" | "codec" }[] = [];

  if (mediaTags?.includes("HIRES_LOSSLESS")) {
    badges.push({ label: "Hi-Res", type: "hires" });
  }

  if (modes?.includes("DOLBY_ATMOS")) {
    badges.push({ label: "Dolby Atmos", type: "quality" });
  } else if (modes?.includes("SONY_360RA")) {
    badges.push({ label: "360 Reality Audio", type: "quality" });
  }

  if (badges.length === 0) return null;

  return (
    <>
      {badges.map((b, i) => (
        <span key={i} className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-medium",
          b.type === "hires" && "bg-tag-hires-bg text-accent-green",
          b.type === "quality" && "bg-tag-quality-bg text-accent-amber",
          b.type === "codec" && "bg-surface-primary text-fg-muted",
        )}>
          {b.label}
        </span>
      ))}
    </>
  );
}
