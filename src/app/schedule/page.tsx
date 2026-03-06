"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarClock, X, Trash2, Clock, Gauge, Check, AlertCircle, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { ScheduledDownload } from "@/lib/types";
import Link from "next/link";

function formatScheduleDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  const dateFormatted = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeFormatted = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  if (diff <= 0) return `${dateFormatted} ${timeFormatted}`;
  if (days > 0) return `${dateFormatted} ${timeFormatted} (in ${days}d ${hours}h)`;
  if (hours > 0) return `${dateFormatted} ${timeFormatted} (in ${hours}h ${mins}m)`;
  return `${dateFormatted} ${timeFormatted} (in ${mins}m)`;
}

function getScheduleStatusColor(status: string): string {
  const colors: Record<string, string> = {
    scheduled: "text-blue-400",
    running: "text-yellow-400",
    completed: "text-green-400",
    cancelled: "text-muted-foreground",
    error: "text-red-400",
  };
  return colors[status] || "text-muted-foreground";
}

function ScheduleCard({ schedule, onUpdate }: { schedule: ScheduledDownload; onUpdate: () => void }) {
  const isPending = schedule.status === "scheduled";
  const isDone = ["completed", "cancelled", "error"].includes(schedule.status);

  const handleCancel = async () => {
    try {
      await api.cancelSchedule(schedule.id);
      toast.success("Schedule cancelled");
      onUpdate();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const handleRemove = async () => {
    try {
      await api.removeSchedule(schedule.id);
      onUpdate();
    } catch {
      toast.error("Failed to remove");
    }
  };

  // Truncate source for display
  const displaySource = schedule.source.length > 60
    ? schedule.source.slice(0, 57) + "..."
    : schedule.source;

  return (
    <Card>
      <CardContent className="p-3.5 space-y-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {schedule.status === "scheduled" && <Clock className="h-4 w-4 text-blue-400" />}
            {schedule.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />}
            {schedule.status === "completed" && <Check className="h-4 w-4 text-green-400" />}
            {schedule.status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
            {schedule.status === "cancelled" && <X className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm break-all line-clamp-2">{displaySource}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {schedule.category}
              </Badge>
              <span className={`text-[10px] capitalize ${getScheduleStatusColor(schedule.status)}`}>
                {schedule.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isPending && (
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

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {formatScheduleDate(schedule.scheduledAt)}
          </span>
          {schedule.speedLimitMbps > 0 && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {schedule.speedLimitMbps} Mbps
            </span>
          )}
          {schedule.speedLimitMbps === 0 && (
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              Unlimited
            </span>
          )}
        </div>

        {schedule.error && (
          <p className="text-xs text-red-400 break-all">{schedule.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduledDownload[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 10000);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  const pending = schedules.filter((s) => s.status === "scheduled" || s.status === "running");
  const history = schedules.filter((s) => ["completed", "cancelled", "error"].includes(s.status));

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Scheduled Downloads</h1>
          <Link href="/add">
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        )}

        {!loading && (
          <>
            {pending.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
                {pending
                  .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                  .map((s) => (
                    <ScheduleCard key={s.id} schedule={s} onUpdate={fetchSchedules} />
                  ))}
              </section>
            )}

            {history.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">History</h2>
                {history.map((s) => (
                  <ScheduleCard key={s.id} schedule={s} onUpdate={fetchSchedules} />
                ))}
              </section>
            )}

            {schedules.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <CalendarClock className="h-8 w-8" />
                <p className="text-sm">No scheduled downloads</p>
                <p className="text-xs">Use the Add page to schedule a download</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
