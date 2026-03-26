"use client";

import { useState } from "react";
import { X, Trash2, ChevronDown, ChevronUp, Check, Pause, Play, Loader2, AlertCircle, Circle } from "lucide-react";
import type { DownloadItem } from "@/lib/types";
import { formatBytes, formatSpeed, formatETA } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useScheduleLater, ScheduleLaterToggle, ScheduleLaterForm } from "./schedule-later";
import { CategoryIcon, getCategoryBarColor } from "@/components/category-icon";
import { QualityTags } from "@/components/quality-tags";
import { ProviderBadge } from "@/components/provider-toggle";

function EpisodeRow({ item, slotsAvailable, onUpdate }: { item: DownloadItem; slotsAvailable: number; onUpdate: () => void }) {
  const percent = Math.round(item.progress * 100);
  const barColor = getCategoryBarColor(item.category);
  const isResolving = item.name === "Resolving link..." || item.name === "Resolving magnet...";

  const handlePause = async (e: React.MouseEvent) => { e.stopPropagation(); try { await api.pauseDownload(item.id); onUpdate(); } catch {} };
  const handleResume = async (e: React.MouseEvent) => { e.stopPropagation(); try { await api.resumeDownload(item.id); onUpdate(); } catch {} };

  return (
    <div className="px-4 py-3 border-b border-border-subtle last:border-0">
      {/* Row 1: icon + name + size + pause button */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 shrink-0 flex justify-center">
          {item.status === "completed" && <Check className="h-4 w-4 text-accent-green" />}
          {item.status === "downloading" && <Loader2 className="h-4 w-4 text-accent-blue animate-spin" />}
          {item.status === "error" && <AlertCircle className="h-4 w-4 text-accent-red" />}
          {(item.status === "queued" || item.status === "pending") && <Circle className="h-4 w-4 text-fg-muted" />}
          {item.status === "paused" && <Pause className="h-3.5 w-3.5 text-accent-amber" />}
          {item.status === "resolving" && <Loader2 className="h-4 w-4 text-accent-amber animate-spin" />}
          {item.status === "moving" && <Loader2 className="h-4 w-4 text-accent-purple animate-spin" />}
        </div>

        <p className="text-[12px] text-fg-primary truncate flex-1 min-w-0">
          {isResolving ? <span className="text-fg-muted italic">Resolving...</span> : item.name}
        </p>

        {item.size > 0 && (
          <span className="text-[11px] font-mono text-fg-muted shrink-0">
            {formatBytes(item.downloaded)} / {formatBytes(item.size)}
          </span>
        )}

        {item.status === "downloading" && (
          <button onClick={handlePause} className="p-1 shrink-0 rounded hover:bg-surface-tertiary transition-colors">
            <Pause className="h-3.5 w-3.5 text-fg-muted" />
          </button>
        )}
        {item.status === "paused" && slotsAvailable > 0 && (
          <button onClick={handleResume} className="p-1 shrink-0 rounded hover:bg-surface-tertiary transition-colors">
            <Play className="h-3.5 w-3.5 text-accent-blue" />
          </button>
        )}
      </div>

      {/* Row 2: progress bar */}
      <div className="mt-2 ml-[30px]">
        <div className="h-1 w-full rounded-full bg-surface-tertiary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              item.status === "completed" ? "bg-accent-green"
                : item.status === "downloading" ? barColor
                : item.status === "paused" ? "bg-accent-amber"
                : "bg-transparent"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Row 3: speed + ETA + percentage */}
        {item.status === "downloading" && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-accent-blue">{formatSpeed(item.speed)}</span>
            <span className="text-[10px] font-mono text-fg-muted">&middot;</span>
            <span className="text-[10px] font-mono text-accent-amber">ETA {formatETA(item.eta)}</span>
            <span className="text-[10px] font-mono text-fg-muted ml-auto">{percent}%</span>
          </div>
        )}
        {item.status === "completed" && (
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] font-mono text-accent-green">100%</span>
          </div>
        )}
        {(item.status === "queued" || item.status === "pending" || item.status === "resolving") && (
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] font-mono text-fg-muted">0%</span>
          </div>
        )}
        {item.status === "paused" && (
          <div className="flex justify-end mt-0.5">
            <span className="text-[10px] font-mono text-accent-amber">{percent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DownloadGroupCard({
  groupId,
  groupName,
  items,
  onUpdate,
  slotsAvailable = 1,
}: {
  groupId: string;
  groupName: string;
  items: DownloadItem[];
  onUpdate: () => void;
  slotsAvailable?: number;
  removing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const scheduleLater = useScheduleLater();

  const completedCount = items.filter((i) => i.status === "completed").length;
  const totalSize = items.reduce((sum, i) => sum + i.size, 0);
  const totalDownloaded = items.reduce((sum, i) => sum + i.downloaded, 0);
  const totalSpeed = items.reduce((sum, i) => sum + i.speed, 0);
  const overallProgress = totalSize > 0 ? totalDownloaded / totalSize : 0;
  const percent = Math.round(overallProgress * 100);

  const category = items[0]?.category;
  const isMusic = category === "music";
  const itemLabel = isMusic ? "tracks" : "episodes";
  const barColor = getCategoryBarColor(category);

  const hasActive = items.some((i) => ["downloading", "resolving", "pending", "moving", "queued"].includes(i.status));
  const hasDownloading = items.some((i) => i.status === "downloading" || i.status === "queued");
  const hasPaused = items.some((i) => i.status === "paused");
  const canSchedule = hasActive || hasPaused;
  const maxETA = items.reduce((max, i) => Math.max(max, i.eta), 0);

  const handlePauseAll = async () => {
    try {
      for (const item of items) { if (["downloading", "queued", "resolving"].includes(item.status)) await api.pauseDownload(item.id); }
      toast.success(`Paused all ${itemLabel}`); onUpdate();
    } catch { toast.error("Failed to pause"); }
  };
  const handleResumeAll = async () => {
    try {
      for (const item of items) { if (item.status === "paused") await api.resumeDownload(item.id); }
      toast.success(`Resumed all ${itemLabel}`); onUpdate();
    } catch { toast.error("Failed to resume"); }
  };
  const handleCancelAll = async () => {
    try {
      for (const item of items) { if (["downloading", "resolving", "pending", "moving", "queued"].includes(item.status)) await api.cancelDownload(item.id); }
      toast.success(`Cancelled all ${itemLabel}`); onUpdate();
    } catch { toast.error("Failed to cancel"); }
  };
  const handleRemoveAll = async () => {
    setIsRemoving(true);
    try {
      for (const item of items) { if (["downloading", "resolving", "pending", "moving", "queued"].includes(item.status)) await api.cancelDownload(item.id); }
      await new Promise((r) => setTimeout(r, 300));
      for (const item of items) await api.removeDownload(item.id);
      onUpdate();
    } catch { setIsRemoving(false); toast.error("Failed to remove"); }
  };

  return (
    <div className={`rounded-2xl border border-border-card bg-surface-secondary overflow-hidden transition-all duration-300 ${isRemoving ? "opacity-0 scale-95" : ""}`}>
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <CategoryIcon category={category} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg-primary leading-snug line-clamp-2">{groupName}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[9px] font-medium text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">{category}</span>
              <ProviderBadge provider={items[0]?.provider} />
              <QualityTags name={groupName} />
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-fg-muted shrink-0 mt-1" />
          ) : (
            <ChevronDown className="h-5 w-5 text-fg-muted shrink-0 mt-1" />
          )}
        </div>

        {/* Overall progress bar with count */}
        <div className="mt-3 space-y-1.5">
          <div className="h-1 w-full rounded-full bg-surface-tertiary overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-fg-muted">
            {hasActive && totalSpeed > 0 ? (
              <>
                <span>{formatSpeed(totalSpeed)}</span>
                <span>ETA {formatETA(maxETA)}</span>
              </>
            ) : null}
            <span className="ml-auto">{completedCount}/{items.length} {itemLabel}</span>
          </div>
        </div>
      </div>

      {/* Schedule form */}
      {scheduleLater.open && canSchedule && (
        <div className="px-4 pb-3">
          <ScheduleLaterForm
            downloadId={items[0].id}
            groupId={groupId}
            onScheduled={() => { scheduleLater.setOpen(false); onUpdate(); }}
            onCancel={() => scheduleLater.setOpen(false)}
          />
        </div>
      )}

      {/* Episode list (expanded) */}
      {expanded && (
        <div className="border-t border-border-card bg-surface-primary/50 max-h-[500px] overflow-y-auto scrollbar-none">
          {[...items].sort((a, b) => {
            const order: Record<string, number> = { downloading: 0, resolving: 1, queued: 2, paused: 3, moving: 4, pending: 5, completed: 6, error: 7, cancelled: 8 };
            const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
            if (diff !== 0) return diff;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
          }).map((item) => (
            <EpisodeRow key={item.id} item={item} slotsAvailable={slotsAvailable} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {/* Action buttons */}
      {(hasActive || hasPaused) && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-2">
          {hasDownloading && (
            <button onClick={(e) => { e.stopPropagation(); handlePauseAll(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors">
              <Pause className="h-3 w-3" /> Pause All
            </button>
          )}
          {hasPaused && !hasDownloading && slotsAvailable > 0 && (
            <button onClick={(e) => { e.stopPropagation(); handleResumeAll(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-blue hover:bg-surface-tertiary transition-colors">
              <Play className="h-3 w-3" /> Resume All
            </button>
          )}
          {canSchedule && (
            <ScheduleLaterToggle open={scheduleLater.open} setOpen={scheduleLater.setOpen} />
          )}
          <button onClick={(e) => { e.stopPropagation(); handleCancelAll(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-red hover:bg-surface-tertiary transition-colors">
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}

      {/* Remove for completed groups */}
      {!hasActive && !hasPaused && (
        <div className="flex items-center gap-2 px-4 pb-4">
          <button onClick={handleRemoveAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-muted hover:text-accent-red hover:bg-surface-tertiary transition-colors">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}
