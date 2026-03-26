"use client";

import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DownloadCard, HistoryRow } from "@/components/downloads/download-card";
import { DownloadGroupCard } from "@/components/downloads/download-group-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDownloads } from "@/hooks/use-downloads";
import { useStorage } from "@/hooks/use-storage";
import { api } from "@/lib/api";
import { formatSpeed } from "@/lib/formatters";
import { WifiOff, Download, HardDrive, Zap, Trash2 } from "lucide-react";
import type { DownloadItem } from "@/lib/types";
import { toast } from "sonner";

interface DownloadEntry { type: "single"; item: DownloadItem; }
interface GroupEntry { type: "group"; groupId: string; groupName: string; items: DownloadItem[]; }
type Entry = DownloadEntry | GroupEntry;

function buildEntries(downloads: DownloadItem[]): { active: Entry[]; completed: Entry[] } {
  const groups = new Map<string, DownloadItem[]>();
  const singles: DownloadItem[] = [];
  for (const d of downloads) {
    if (d.groupId) {
      const existing = groups.get(d.groupId) || [];
      existing.push(d);
      groups.set(d.groupId, existing);
    } else {
      singles.push(d);
    }
  }
  const entries: Entry[] = [];
  for (const [groupId, items] of groups) entries.push({ type: "group", groupId, groupName: items[0].groupName || groupId, items });
  for (const item of singles) entries.push({ type: "single", item });

  const isActive = (e: Entry) => {
    if (e.type === "group") return e.items.some((i) => ["downloading", "resolving", "pending", "moving", "paused", "queued"].includes(i.status));
    return ["downloading", "resolving", "pending", "moving", "paused", "queued"].includes(e.item.status);
  };
  return { active: entries.filter(isActive), completed: entries.filter((e) => !isActive(e)) };
}

export default function DownloadsPage() {
  const { downloads, loading, error, refresh } = useDownloads();
  const { storage } = useStorage();
  const [maxConcurrent, setMaxConcurrent] = useState(4);

  useEffect(() => {
    api.getSettings().then((s) => setMaxConcurrent(s.maxConcurrentDownloads)).catch(() => {});
  }, []);

  const { active, completed } = useMemo(() => buildEntries(downloads), [downloads]);
  const activeCount = active.reduce((n, e) => n + (e.type === "group" ? e.items.length : 1), 0);
  const downloadingCount = downloads.filter((d) => d.status === "downloading" || d.status === "resolving" || d.status === "moving").length;
  const totalSpeed = downloads.reduce((sum, d) => sum + d.speed, 0);
  const freeGB = storage ? Math.round(storage.external.available / (1024 * 1024 * 1024)) : null;

  const handleClearHistory = async () => {
    try {
      const done = downloads.filter((d) => ["completed", "error", "cancelled"].includes(d.status));
      for (const d of done) await api.removeDownload(d.id);
      toast.success("History cleared");
      refresh();
    } catch { toast.error("Failed to clear history"); }
  };

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5">
        <PageHeader title="Downloads" />

        {/* Status bar */}
        {!loading && downloads.length > 0 && (
          <div className="flex items-center gap-4 text-[11px] font-mono text-fg-muted">
            <span className="flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-accent-blue" />
              {activeCount} Active
            </span>
            {freeGB !== null && (
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-accent-green" />
                {freeGB} GB
              </span>
            )}
            {totalSpeed > 0 && (
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-accent-amber" />
                {formatSpeed(totalSpeed)}
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[100px] w-full rounded-2xl bg-surface-secondary" />)}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-fg-muted">
            <WifiOff className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <button onClick={refresh} className="text-xs text-accent-blue hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Active column */}
            <div className="flex-1 min-w-0 space-y-3">
              {active.length > 0 && (
                <section className="space-y-2.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Active</h2>
                  {active.map((entry) =>
                    entry.type === "group" ? (
                      <DownloadGroupCard
                        key={entry.groupId}
                        groupId={entry.groupId}
                        groupName={entry.groupName}
                        items={entry.items}
                        onUpdate={refresh}
                        slotsAvailable={maxConcurrent - downloadingCount}
                      />
                    ) : (
                      <DownloadCard key={entry.item.id} item={entry.item} onUpdate={refresh} slotsAvailable={maxConcurrent - downloadingCount} />
                    )
                  )}
                </section>
              )}

              {downloads.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
                  <Download className="h-10 w-10" />
                  <p className="text-sm font-medium">No downloads yet</p>
                  <p className="text-xs">Go to Add to start downloading</p>
                </div>
              )}

              {/* History (mobile: below active, desktop: separate column on lg) */}
              {completed.length > 0 && (
                <section className="space-y-1 lg:hidden">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">History</h2>
                    <button onClick={handleClearHistory} className="flex items-center gap-1 text-[10px] text-fg-muted hover:text-accent-red transition-colors">
                      <Trash2 className="h-3 w-3" /> Clear All
                    </button>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {completed.map((entry) =>
                      entry.type === "single" ? (
                        <HistoryRow key={entry.item.id} item={entry.item} onUpdate={refresh} />
                      ) : (
                        entry.items.map((item) => (
                          <HistoryRow key={item.id} item={item} onUpdate={refresh} />
                        ))
                      )
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* History column (desktop only) */}
            {completed.length > 0 && (
              <div className="hidden lg:block w-80 shrink-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">History</h2>
                  <button onClick={handleClearHistory} className="flex items-center gap-1 text-[10px] text-fg-muted hover:text-accent-red transition-colors">
                    <Trash2 className="h-3 w-3" /> Clear All
                  </button>
                </div>
                <div className="divide-y divide-border-subtle">
                  {completed.map((entry) =>
                    entry.type === "single" ? (
                      <HistoryRow key={entry.item.id} item={entry.item} onUpdate={refresh} />
                    ) : (
                      entry.items.map((item) => (
                        <HistoryRow key={item.id} item={item} onUpdate={refresh} />
                      ))
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
