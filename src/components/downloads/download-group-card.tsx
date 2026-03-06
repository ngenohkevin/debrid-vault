"use client";

import { useState } from "react";
import { X, Trash2, ChevronDown, ChevronRight, ArrowDown, Check, Tv, AlertCircle, Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DownloadItem } from "@/lib/types";
import { formatBytes, formatSpeed, formatETA } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

function EpisodeRow({ item }: { item: DownloadItem }) {
  const percent = Math.round(item.progress * 100);
  const isRetrying = item.status === "downloading" && item.error?.includes("retry");

  return (
    <div className="flex items-center gap-2 px-3.5 py-2 text-xs border-b border-border/20 last:border-0">
      <div className="w-5 shrink-0 flex justify-center">
        {item.status === "completed" && <Check className="h-3.5 w-3.5 text-green-400" />}
        {item.status === "downloading" && !isRetrying && (
          <span className="text-[10px] font-mono text-blue-400">{percent}%</span>
        )}
        {item.status === "downloading" && isRetrying && (
          <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
        )}
        {item.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
        {item.status === "resolving" && <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />}
        {item.status === "moving" && <Loader2 className="h-3 w-3 animate-spin text-purple-400" />}
        {item.status === "paused" && <Pause className="h-3 w-3 text-amber-400" />}
        {item.status === "queued" && <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
        {(item.status === "pending" || item.status === "cancelled") && (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{item.name}</p>
        {isRetrying && (
          <p className="truncate text-[9px] text-amber-400/80 mt-0.5">{item.error}</p>
        )}
      </div>
      <div className="shrink-0 text-[10px] text-muted-foreground">
        {item.status === "downloading" && !isRetrying && formatSpeed(item.speed)}
        {item.status === "downloading" && isRetrying && <span className="text-amber-400">retrying</span>}
        {item.status === "completed" && formatBytes(item.size)}
        {item.status === "error" && <span className="text-red-400">failed</span>}
        {item.status === "queued" && "queued"}
        {item.status === "pending" && "waiting"}
        {item.status === "resolving" && "resolving"}
        {item.status === "moving" && "moving"}
        {item.status === "paused" && <span className="text-amber-400">paused</span>}
      </div>
    </div>
  );
}

export function DownloadGroupCard({
  groupName,
  items,
  onUpdate,
}: {
  groupId: string;
  groupName: string;
  items: DownloadItem[];
  onUpdate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const completedCount = items.filter((i) => i.status === "completed").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const totalSize = items.reduce((sum, i) => sum + i.size, 0);
  const totalDownloaded = items.reduce((sum, i) => sum + i.downloaded, 0);
  const totalSpeed = items.reduce((sum, i) => sum + i.speed, 0);
  const overallProgress = totalSize > 0 ? totalDownloaded / totalSize : 0;
  const percent = Math.round(overallProgress * 100);

  const isAllDone = items.every((i) => ["completed", "error", "cancelled"].includes(i.status));
  const isAllCompleted = items.every((i) => i.status === "completed");
  const hasActive = items.some((i) => ["downloading", "resolving", "pending", "moving", "queued"].includes(i.status));
  const hasDownloading = items.some((i) => i.status === "downloading" || i.status === "queued");
  const hasPaused = items.some((i) => i.status === "paused");

  // ETA: use the max ETA from active downloads
  const maxETA = items.reduce((max, i) => Math.max(max, i.eta), 0);

  const handlePauseAll = async () => {
    try {
      for (const item of items) {
        if (item.status === "downloading" || item.status === "queued") {
          await api.pauseDownload(item.id);
        }
      }
      toast.success("Paused all episodes");
      onUpdate();
    } catch {
      toast.error("Failed to pause");
    }
  };

  const handleResumeAll = async () => {
    try {
      for (const item of items) {
        if (item.status === "paused") {
          await api.resumeDownload(item.id);
        }
      }
      toast.success("Resumed all episodes");
      onUpdate();
    } catch {
      toast.error("Failed to resume");
    }
  };

  const handleCancelAll = async () => {
    try {
      for (const item of items) {
        if (["downloading", "resolving", "pending", "moving", "queued"].includes(item.status)) {
          await api.cancelDownload(item.id);
        }
      }
      toast.success("Cancelled all episodes");
      onUpdate();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const handleRemoveAll = async () => {
    try {
      for (const item of items) {
        await api.removeDownload(item.id);
      }
      onUpdate();
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="mt-0.5 shrink-0">
          <Tv className="h-4 w-4 text-purple-400" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-snug line-clamp-2">{groupName}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {completedCount}/{items.length} episodes
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-[10px] font-normal">
                {errorCount} failed
              </Badge>
            )}
            {totalSize > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {formatBytes(totalDownloaded)} / {formatBytes(totalSize)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {hasDownloading && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handlePauseAll(); }} title="Pause all">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {hasPaused && !hasDownloading && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={(e) => { e.stopPropagation(); handleResumeAll(); }} title="Resume all">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {hasActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleCancelAll(); }} title="Cancel all">
              <X className="h-4 w-4" />
            </Button>
          )}
          {isAllDone && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleRemoveAll(); }} title="Remove all">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      {!isAllCompleted && (
        <div className="px-3.5 pb-2 space-y-1.5">
          <div className="relative h-5 w-full rounded bg-muted/50 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded transition-all duration-300 ease-linear ${
                isAllDone ? (errorCount > 0 ? "bg-red-500/60" : "bg-green-500/80") : "bg-blue-500/80"
              }`}
              style={{ width: `${percent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-mono font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                {percent}%
              </span>
            </div>
          </div>
          {hasActive && totalSpeed > 0 && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
              <span className="w-[40%] text-left">{completedCount}/{items.length} done</span>
              <span className="w-[30%] flex items-center justify-center gap-1">
                <ArrowDown className="h-3 w-3 text-blue-400 shrink-0" />
                {formatSpeed(totalSpeed)}
              </span>
              <span className="w-[30%] text-right">{formatETA(maxETA)}</span>
            </div>
          )}
        </div>
      )}

      {isAllCompleted && (
        <div className="px-3.5 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-green-400" />
          <span>All {items.length} episodes &middot; {formatBytes(totalSize)}</span>
        </div>
      )}

      {/* Episode list */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <EpisodeRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
