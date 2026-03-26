"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Download, CalendarClock, Clipboard, Info, Film, Tv, Music2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { useProviders } from "@/hooks/use-providers";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const categories: { value: Category; label: string; icon: typeof Film }[] = [
  { value: "movies", label: "Movies", icon: Film },
  { value: "tv-shows", label: "TV Shows", icon: Tv },
  { value: "music", label: "Music", icon: Music2 },
];

export default function AddPage() {
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<Category>("movies");
  const [provider, setProvider] = useState("realdebrid");
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(4, 0, 0, 0);
    return toLocalDatetime(d);
  });
  const [speedLimit, setSpeedLimit] = useState(0);
  const router = useRouter();
  const { providers, hasMultiple } = useProviders();

  const hasSource = source.trim().length > 0;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setSource(text);
    } catch { toast.error("Clipboard access denied"); }
  };

  const handleSubmit = async () => {
    if (!hasSource) { toast.error("Paste a link or magnet"); return; }
    setSubmitting(true);
    try {
      if (scheduled) {
        await api.createSchedule(source.trim(), category, new Date(scheduleDate).toISOString(), speedLimit, undefined, undefined, provider);
        toast.success("Download scheduled!"); setSource(""); router.push("/schedule");
      } else {
        await api.startDownload(source.trim(), category, undefined, provider);
        toast.success("Download started!"); setSource(""); router.push("/");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-6 max-w-lg mx-auto">
        <PageHeader title="Add Download" />

        {/* Link input */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-fg-secondary">Paste link or magnet</label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              placeholder="magnet:, RD link, or direct URL..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-secondary border border-border-card text-[13px] text-fg-primary placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
          </div>
          <button
            onClick={handlePaste}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border-card text-[13px] text-fg-secondary hover:bg-surface-secondary transition-colors"
          >
            <Clipboard className="h-4 w-4" /> Paste from Clipboard
          </button>
        </div>

        {/* Category */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-fg-secondary">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors",
                  category === c.value
                    ? "bg-accent-blue text-white"
                    : "bg-surface-secondary border border-border-card text-fg-secondary hover:bg-surface-tertiary"
                )}
              >
                <c.icon className="h-4 w-4" /> {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Provider */}
        {hasMultiple && (
          <div className="space-y-3">
            <label className="text-[13px] font-medium text-fg-secondary">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setProvider(p.name)}
                  className={cn(
                    "py-3 rounded-xl text-[13px] font-medium transition-colors",
                    provider === p.name
                      ? "bg-accent-blue text-white"
                      : "bg-surface-secondary border border-border-card text-fg-secondary hover:bg-surface-tertiary"
                  )}
                >
                  {p.displayName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metadata note for music */}
        {category === "music" && (
          <div className="rounded-2xl bg-surface-secondary border border-border-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-fg-muted" />
              <span className="text-[13px] font-semibold text-fg-primary">Metadata</span>
            </div>
            <p className="text-[11px] text-fg-secondary leading-relaxed">
              Music downloads are auto-tagged with artist, album, track number, cover art, and MusicBrainz IDs (ISRC, label, genre).
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[8px] font-medium bg-tag-hires-bg text-accent-green px-1.5 py-0.5 rounded-full">Hi-Res FLAC</span>
              <span className="text-[8px] font-medium bg-surface-tertiary text-fg-muted px-1.5 py-0.5 rounded-full">MusicBrainz</span>
              <span className="text-[8px] font-medium bg-surface-tertiary text-fg-muted px-1.5 py-0.5 rounded-full">Cover Art</span>
            </div>
          </div>
        )}

        {/* Schedule toggle */}
        <div className="rounded-2xl bg-surface-secondary border border-border-card p-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setScheduled(!scheduled)}>
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-4 w-4 text-fg-muted" />
              <span className="text-[13px] text-fg-secondary">Schedule for later</span>
            </div>
            <div className={cn("h-6 w-10 rounded-full transition-colors relative", scheduled ? "bg-accent-blue" : "bg-surface-tertiary")}>
              <div className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform", scheduled ? "translate-x-5" : "translate-x-1")} />
            </div>
          </div>

          {scheduled && (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-fg-muted">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-10 text-[13px] bg-surface-tertiary border-border-card"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-fg-muted">Speed Limit (Mbps)</label>
                <Input
                  type="number" min={0} step={1}
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(parseFloat(e.target.value) || 0)}
                  placeholder="0 = unlimited"
                  className="h-10 text-[13px] bg-surface-tertiary border-border-card"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!hasSource || submitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-colors",
            hasSource && !submitting
              ? "bg-accent-blue text-white hover:bg-accent-blue/90"
              : "bg-surface-tertiary text-fg-muted cursor-not-allowed"
          )}
        >
          <Download className="h-4 w-4" />
          {submitting ? (scheduled ? "Scheduling..." : "Starting...") : (scheduled ? "Schedule Download" : "Start Download")}
        </button>
      </div>
    </AppShell>
  );
}
