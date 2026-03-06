"use client";

import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DownloadCard } from "@/components/downloads/download-card";
import { DownloadGroupCard } from "@/components/downloads/download-group-card";
import { SpeedLimit } from "@/components/downloads/speed-limit";
import { StorageCards } from "@/components/library/storage-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/use-downloads";
import { useStorage } from "@/hooks/use-storage";
import { api } from "@/lib/api";
import { WifiOff, Download, Loader2 } from "lucide-react";
import type { DownloadItem } from "@/lib/types";

interface DownloadEntry {
  type: "single";
  item: DownloadItem;
}

interface GroupEntry {
  type: "group";
  groupId: string;
  groupName: string;
  items: DownloadItem[];
}

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

  for (const [groupId, items] of groups) {
    entries.push({
      type: "group",
      groupId,
      groupName: items[0].groupName || groupId,
      items,
    });
  }

  for (const item of singles) {
    entries.push({ type: "single", item });
  }

  const isActive = (e: Entry) => {
    if (e.type === "group") {
      return e.items.some((i) => ["downloading", "resolving", "pending", "moving", "paused", "queued"].includes(i.status));
    }
    return ["downloading", "resolving", "pending", "moving", "paused", "queued"].includes(e.item.status);
  };

  return {
    active: entries.filter(isActive),
    completed: entries.filter((e) => !isActive(e)),
  };
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

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Downloads</h1>
            {!loading && downloads.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeCount} active &middot; {completed.length} history
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <StorageCards storage={storage} />

        {/* Speed limit control */}
        {!loading && activeCount > 0 && (
          <SpeedLimit compact />
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <WifiOff className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <button onClick={refresh} className="text-xs text-primary hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {active.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
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

            {completed.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">History</h2>
                {completed.map((entry) =>
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
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Download className="h-8 w-8" />
                <p className="text-sm">No downloads yet</p>
                <p className="text-xs">Go to Add to start downloading</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
