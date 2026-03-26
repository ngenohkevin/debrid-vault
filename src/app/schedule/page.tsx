"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarClock, X, Trash2, Check, Pencil, RotateCcw, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/category-icon";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ScheduledDownload, Category } from "@/lib/types";

function formatCountdown(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Starting...";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatScheduleTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${time}`;
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ScheduleCard({ schedule, onUpdate }: { schedule: ScheduledDownload; onUpdate: () => void }) {
  const isPending = schedule.status === "scheduled";
  const isRunning = schedule.status === "running";
  const isError = schedule.status === "error";
  const canEdit = isPending || isError;

  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(() => toLocalDatetime(new Date(schedule.scheduledAt)));
  const [editSpeed, setEditSpeed] = useState(schedule.speedLimitMbps);
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    try {
      if (isPending || isRunning) await api.cancelSchedule(schedule.id);
      await api.removeSchedule(schedule.id);
      onUpdate();
    } catch { toast.error("Failed to delete"); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSchedule(schedule.id, { scheduledAt: new Date(editDate).toISOString(), speedLimitMbps: editSpeed });
      toast.success(isError ? "Rescheduled!" : "Updated");
      setEditing(false); onUpdate();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleReschedule = () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(4, 0, 0, 0);
    setEditDate(toLocalDatetime(d));
    setEditSpeed(schedule.speedLimitMbps);
    setEditing(true);
  };

  const displayName = schedule.name || (schedule.source.length > 60 ? schedule.source.slice(0, 57) + "..." : schedule.source);

  return (
    <div className="rounded-2xl border border-border-card bg-surface-secondary p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <CategoryIcon category={schedule.category as Category} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-fg-primary line-clamp-2">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] font-medium text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">{schedule.category}</span>
            {schedule.speedLimitMbps > 0 && (
              <span className="text-[9px] font-mono text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">
                {schedule.speedLimitMbps} Mbps
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Schedule time */}
      {!editing && (
        <div className="rounded-xl bg-surface-tertiary p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-fg-muted" />
            <div>
              <p className="text-[12px] font-medium text-fg-primary">{formatScheduleTime(schedule.scheduledAt)}</p>
              {isPending && (
                <p className="text-[11px] font-mono text-accent-amber">Starts in {formatCountdown(schedule.scheduledAt)}</p>
              )}
              {isRunning && <p className="text-[11px] text-accent-amber">Running now...</p>}
            </div>
          </div>
          {schedule.speedLimitMbps > 0 && (
            <span className="text-[10px] font-mono text-fg-muted bg-surface-secondary px-2 py-1 rounded-lg">
              {schedule.speedLimitMbps} Mbps
            </span>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && canEdit && (
        <div className="space-y-3 rounded-xl bg-surface-tertiary p-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-fg-muted">Date & Time</label>
            <Input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9 text-xs bg-surface-secondary border-border-card" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-fg-muted">Speed Limit (Mbps)</label>
            <Input type="number" min={0} step={1} value={editSpeed} onChange={(e) => setEditSpeed(parseFloat(e.target.value) || 0)} placeholder="0 = unlimited" className="h-9 text-xs bg-surface-secondary border-border-card" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-accent-blue text-white text-[12px] font-medium hover:bg-accent-blue/90 disabled:opacity-50">
              {saving ? "Saving..." : isError ? "Reschedule" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-border-card text-[12px] text-fg-secondary hover:bg-surface-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Error message */}
      {!editing && schedule.error && (
        <p className="text-[11px] text-accent-red break-all">{schedule.error}</p>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-2">
          {isPending && (
            <button onClick={() => { setEditDate(toLocalDatetime(new Date(schedule.scheduledAt))); setEditSpeed(schedule.speedLimitMbps); setEditing(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {isError && (
            <button onClick={handleReschedule} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-blue hover:bg-surface-tertiary transition-colors">
              <RotateCcw className="h-3 w-3" /> Reschedule
            </button>
          )}
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-accent-red hover:bg-surface-tertiary transition-colors">
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function CompletedRow({ schedule, onUpdate }: { schedule: ScheduledDownload; onUpdate: () => void }) {
  const handleRemove = async () => {
    try { await api.removeSchedule(schedule.id); onUpdate(); }
    catch { toast.error("Failed to remove"); }
  };
  const displayName = schedule.name || schedule.source.slice(0, 40);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <CategoryIcon category={schedule.category as Category} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-fg-primary truncate">{displayName}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Check className="h-3 w-3 text-accent-green" />
          <span className="text-[10px] text-fg-muted">
            Completed &middot; {schedule.completedAt ? new Date(schedule.completedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      </div>
      <button onClick={handleRemove} className="p-1.5 rounded-lg text-fg-muted hover:text-accent-red hover:bg-surface-tertiary transition-colors shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduledDownload[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try { setSchedules((await api.getSchedules()) || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 10000);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  const upcoming = schedules.filter((s) => s.status === "scheduled" || s.status === "running");
  const completed = schedules.filter((s) => ["completed", "cancelled", "error"].includes(s.status));

  const handleClearCompleted = async () => {
    try {
      for (const s of completed) await api.removeSchedule(s.id);
      toast.success("Cleared"); fetchSchedules();
    } catch { toast.error("Failed to clear"); }
  };

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5 max-w-2xl mx-auto">
        <PageHeader title="Schedule">
          <Link href="/add" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[12px] font-medium hover:bg-accent-blue/90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> New
          </Link>
        </PageHeader>

        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-surface-secondary" />)}
          </div>
        )}

        {!loading && (
          <>
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Upcoming</h2>
                {upcoming
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .map((s) => <ScheduleCard key={s.id} schedule={s} onUpdate={fetchSchedules} />)}
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Completed</h2>
                  <button onClick={handleClearCompleted} className="flex items-center gap-1 text-[10px] text-fg-muted hover:text-accent-red transition-colors">
                    <Trash2 className="h-3 w-3" /> Clear All
                  </button>
                </div>
                <div className="divide-y divide-border-subtle">
                  {completed.map((s) => <CompletedRow key={s.id} schedule={s} onUpdate={fetchSchedules} />)}
                </div>
              </section>
            )}

            {schedules.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
                <CalendarClock className="h-10 w-10" />
                <p className="text-sm font-medium">No scheduled downloads</p>
                <p className="text-xs">Schedule downloads from the Add page</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
