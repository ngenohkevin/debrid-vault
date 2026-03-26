"use client";

import { useState } from "react";
import { X, Trash2, RotateCcw, Check, Pause, Play, RefreshCw, HardDrive, CalendarClock } from "lucide-react";
import type { DownloadItem } from "@/lib/types";
import { formatBytes, formatSpeed, formatETA } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useScheduleLater, ScheduleLaterToggle, ScheduleLaterForm } from "./schedule-later";
import { CategoryIcon, getCategoryBarColor } from "@/components/category-icon";
import { QualityTags } from "@/components/quality-tags";
import { ProviderBadge } from "@/components/provider-toggle";

export function DownloadCard({ item, onUpdate, slotsAvailable = 1 }: { item: DownloadItem; onUpdate: () => void; slotsAvailable?: number }) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isActive = ["downloading", "resolving", "pending", "moving", "queued"].includes(item.status);
  const isDone = ["completed", "error", "cancelled"].includes(item.status);
  const isPaused = item.status === "paused";
  const isScheduled = isPaused && !!item.scheduledFor;
  const percent = Math.round(item.progress * 100);
  const barColor = getCategoryBarColor(item.category);

  const hasStatusHint = item.status === "downloading" && item.error;
  const isRetrying = hasStatusHint && (item.error?.includes("retry") || item.error?.includes("Retrying"));

  const handleCancel = async () => {
    setIsRemoving(true);
    try {
      await api.cancelDownload(item.id);
      await new Promise((r) => setTimeout(r, 300));
      await api.removeDownload(item.id);
      toast.success("Download cancelled"); onUpdate();
    } catch { setIsRemoving(false); toast.error("Failed to cancel"); }
  };
  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      if (isActive) await api.cancelDownload(item.id);
      await new Promise((r) => setTimeout(r, 300));
      await api.removeDownload(item.id); onUpdate();
    } catch { setIsRemoving(false); toast.error("Failed to remove"); }
  };
  const handlePause = async () => {
    try { await api.pauseDownload(item.id); toast.success("Download paused"); onUpdate(); }
    catch { toast.error("Failed to pause"); }
  };
  const handleResume = async () => {
    try { await api.resumeDownload(item.id); toast.success("Download resumed"); onUpdate(); }
    catch { toast.error("Failed to resume"); }
  };
  const handleRetry = async () => {
    try { await api.removeDownload(item.id); await api.startDownload(item.source, item.category); toast.success("Retrying download"); onUpdate(); }
    catch { toast.error("Failed to retry"); }
  };
  const handleRetryMove = async () => {
    try { await api.retryMove(item.id); toast.success("Retrying move"); onUpdate(); }
    catch { toast.error("Failed to retry move"); }
  };

  const canRetryMove = item.status === "error" && item.error?.includes("staging");
  const canSchedule = item.status === "downloading" || item.status === "queued" || isPaused;
  const scheduleLater = useScheduleLater();

  return (
    <div className={`rounded-2xl border border-border-card bg-surface-secondary overflow-hidden transition-all duration-300 ${isRemoving ? "opacity-0 scale-95" : ""}`}>
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <CategoryIcon category={item.category} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg-primary leading-snug line-clamp-2">{item.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[9px] font-medium text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">{item.category}</span>
              <ProviderBadge provider={item.provider} />
              {item.size > 0 && <span className="text-[9px] font-mono text-fg-muted">{formatBytes(item.size)}</span>}
              <QualityTags name={item.name} />
            </div>
          </div>
          {/* Percentage on right */}
          {item.status === "downloading" && (
            <span className="text-[13px] font-mono font-semibold text-fg-primary shrink-0">{percent}%</span>
          )}
        </div>

        {/* Progress bar */}
        {(item.status === "downloading" || item.status === "moving") && (
          <div className="space-y-1.5">
            <div className="h-1 w-full rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-linear ${isRetrying ? "bg-accent-amber" : barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
              <span className="flex items-center gap-1">
                <span className={isRetrying ? "text-accent-amber" : "text-accent-green"}>
                  {isRetrying ? <RefreshCw className="inline h-3 w-3 animate-spin" /> : `${formatSpeed(item.speed)}`}
                </span>
              </span>
              <span>ETA {formatETA(item.eta)}</span>
            </div>
          </div>
        )}

        {/* Paused bar */}
        {isPaused && (
          <div className="space-y-1.5">
            <div className="h-1 w-full rounded-full bg-surface-tertiary overflow-hidden">
              <div className={`h-full rounded-full ${isScheduled ? "bg-accent-blue" : "bg-accent-amber"}`} style={{ width: `${percent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-fg-muted">
              <span className="font-mono">{formatBytes(item.downloaded)} / {formatBytes(item.size)}</span>
              {isScheduled && (
                <span className="flex items-center gap-1 text-accent-blue">
                  <CalendarClock className="h-3 w-3" />
                  {new Date(item.scheduledFor!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        )}

        {item.status === "resolving" && (
          <div className="h-1 w-full rounded-full bg-surface-tertiary overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-accent-amber animate-pulse" />
          </div>
        )}

        {item.status === "queued" && (
          <div className="h-1 w-full rounded-full bg-surface-tertiary" />
        )}

        {item.status === "error" && item.error && (
          <p className="text-[11px] text-accent-red break-all">{item.error}</p>
        )}

        {item.status === "completed" && (
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            <Check className="h-3.5 w-3.5 text-accent-green" />
            <span className="font-mono">{formatBytes(item.size)}</span>
          </div>
        )}

        {/* Action buttons */}
        {(isActive || isPaused) && (
          <div className="flex items-center gap-2">
            {item.status === "downloading" && (
              <button onClick={handlePause} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors">
                <Pause className="h-3 w-3" /> Pause
              </button>
            )}
            {isPaused && slotsAvailable > 0 && (
              <button onClick={handleResume} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-blue hover:bg-surface-tertiary transition-colors">
                <Play className="h-3 w-3" /> Resume
              </button>
            )}
            {canSchedule && (
              <ScheduleLaterToggle open={scheduleLater.open} setOpen={scheduleLater.setOpen} />
            )}
            <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-red hover:bg-surface-tertiary transition-colors">
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-2">
            {canRetryMove && (
              <button onClick={handleRetryMove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-purple hover:bg-surface-tertiary transition-colors">
                <HardDrive className="h-3 w-3" /> Retry Move
              </button>
            )}
            {(item.status === "error" || item.status === "cancelled") && !canRetryMove && (
              <button onClick={handleRetry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors">
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            )}
            <button onClick={handleRemove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-muted hover:text-accent-red hover:bg-surface-tertiary transition-colors">
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        )}

        {scheduleLater.open && canSchedule && (
          <ScheduleLaterForm
            downloadId={item.id}
            onScheduled={() => { scheduleLater.setOpen(false); onUpdate(); }}
            onCancel={() => scheduleLater.setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

/** Compact history row for completed items */
export function HistoryRow({ item, onUpdate }: { item: DownloadItem; onUpdate: () => void }) {
  const handleRemove = async () => {
    try { await api.removeDownload(item.id); onUpdate(); }
    catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="flex items-center gap-3 py-2.5">
      <CategoryIcon category={item.category} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-fg-primary truncate">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.status === "completed" && <Check className="h-3 w-3 text-accent-green" />}
          <span className="text-[10px] font-mono text-fg-muted">{formatBytes(item.size)}</span>
          {item.status === "error" && <span className="text-[10px] text-accent-red">Failed</span>}
        </div>
      </div>
      <button onClick={handleRemove} className="p-1.5 rounded-lg text-fg-muted hover:text-accent-red hover:bg-surface-tertiary transition-colors shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
