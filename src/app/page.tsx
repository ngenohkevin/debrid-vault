"use client";

import { AppShell } from "@/components/layout/app-shell";
import { DownloadCard } from "@/components/downloads/download-card";
import { StorageCards } from "@/components/library/storage-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDownloads } from "@/hooks/use-downloads";
import { useStorage } from "@/hooks/use-storage";
import { WifiOff, Download, Loader2 } from "lucide-react";

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
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Downloads</h1>
            {!loading && downloads.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {active.length} active &middot; {completed.length} completed
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        <StorageCards storage={storage} />

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
                {active.map((item) => (
                  <DownloadCard key={item.id} item={item} onUpdate={refresh} />
                ))}
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">History</h2>
                {completed.map((item) => (
                  <DownloadCard key={item.id} item={item} onUpdate={refresh} />
                ))}
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
