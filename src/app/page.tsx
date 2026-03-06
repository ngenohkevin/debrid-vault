"use client";

import { AppShell } from "@/components/layout/app-shell";
import { DownloadCard } from "@/components/downloads/download-card";
import { StorageCards } from "@/components/library/storage-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDownloads } from "@/hooks/use-downloads";
import { useStorage } from "@/hooks/use-storage";
import { WifiOff } from "lucide-react";

export default function DownloadsPage() {
  const { downloads, loading, error, refresh } = useDownloads();
  const { storage } = useStorage();

  const active = downloads.filter((d) =>
    ["downloading", "resolving", "pending", "moving"].includes(d.status)
  );
  const completed = downloads.filter((d) =>
    ["completed", "error", "cancelled"].includes(d.status)
  );

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Downloads</h1>
          {active.length > 0 && (
            <Badge variant="secondary">{active.length} active</Badge>
          )}
        </div>

        <StorageCards storage={storage} />

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <WifiOff className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <button onClick={refresh} className="text-sm text-primary hover:underline">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
                {active.map((item) => (
                  <DownloadCard key={item.id} item={item} onUpdate={refresh} />
                ))}
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">History</h2>
                {completed.map((item) => (
                  <DownloadCard key={item.id} item={item} onUpdate={refresh} />
                ))}
              </section>
            )}

            {downloads.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No downloads yet</p>
                <p className="text-xs mt-1">Go to Add to start downloading</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
