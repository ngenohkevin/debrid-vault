"use client";

import { X, Trash2, RotateCcw, ArrowDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Tv } from "lucide-react";
import type { DownloadItem } from "@/lib/types";
import { formatBytes, formatSpeed, formatETA, getStatusColor } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function DownloadCard({ item, onUpdate }: { item: DownloadItem; onUpdate: () => void }) {
  const isActive = ["downloading", "resolving", "pending", "moving"].includes(item.status);
  const isDone = ["completed", "error", "cancelled"].includes(item.status);
  const percent = Math.round(item.progress * 100);

  const handleCancel = async () => {
    try {
      await api.cancelDownload(item.id);
      toast.success("Download cancelled");
      onUpdate();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const handleRemove = async () => {
    try {
      await api.removeDownload(item.id);
      onUpdate();
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleRetry = async () => {
    try {
      await api.removeDownload(item.id);
      await api.startDownload(item.source, item.category);
      toast.success("Retrying download");
      onUpdate();
    } catch {
      toast.error("Failed to retry");
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="p-3.5 space-y-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {item.category === "movies" ? (
              <Film className="h-4 w-4 text-blue-400" />
            ) : (
              <Tv className="h-4 w-4 text-purple-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug line-clamp-2">{item.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {item.category}
              </Badge>
              <span className={`text-[10px] capitalize ${getStatusColor(item.status)}`}>{item.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {item.status === "error" && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRetry} title="Retry">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            {isActive && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancel} title="Cancel">
                <X className="h-4 w-4" />
              </Button>
            )}
            {isDone && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={handleRemove} title="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {item.status === "downloading" && (
          <div className="space-y-1.5">
            {/* Torrent-style progress bar */}
            <div className="relative h-5 w-full rounded bg-muted/50 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded bg-blue-500/80 transition-all duration-300 ease-linear"
                style={{ width: `${percent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-mono font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                  {percent}%
                </span>
              </div>
            </div>
            {/* Stats row */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatBytes(item.downloaded)} / {formatBytes(item.size)}</span>
              <span className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3 text-blue-400" />
                {formatSpeed(item.speed)}
              </span>
              <span>{formatETA(item.eta)}</span>
            </div>
          </div>
        )}

        {item.status === "resolving" && (
          <div className="space-y-1.5">
            <div className="relative h-5 w-full rounded bg-muted/50 overflow-hidden">
              <div className="absolute inset-0 bg-yellow-500/30 animate-pulse rounded" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-mono text-yellow-400">Resolving...</span>
              </div>
            </div>
          </div>
        )}

        {item.status === "moving" && (
          <div className="space-y-1.5">
            <div className="relative h-5 w-full rounded bg-muted/50 overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/30 animate-pulse rounded" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-mono text-purple-400">Moving to {item.category}...</span>
              </div>
            </div>
          </div>
        )}

        {item.status === "error" && item.error && (
          <p className="text-xs text-red-400 break-all">{item.error}</p>
        )}

        {item.status === "completed" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-green-400" />
            <span>{formatBytes(item.size)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
