"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Category } from "@/lib/types";

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(4, 0, 0, 0);
  return toLocalDatetime(d);
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: string;
  category: Category;
  folder?: string;
  name?: string;
  provider?: string;
  onScheduled?: () => void;
}

export function ScheduleDialog({ open, onOpenChange, source, category, folder, name, provider, onScheduled }: ScheduleDialogProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultScheduleDate);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSchedule = async () => {
    setSubmitting(true);
    try {
      const scheduledAt = new Date(scheduleDate).toISOString();
      await api.createSchedule(source, category, scheduledAt, speedLimit, folder, name, provider);
      toast.success("Download scheduled!");
      onOpenChange(false);
      onScheduled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface-secondary border-border-card">
        <DialogHeader>
          <DialogTitle className="text-[15px] text-fg-primary">Schedule Download</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {name && (
            <p className="text-[13px] text-fg-secondary line-clamp-2">{name}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-fg-muted">Date & Time</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="h-10 text-[13px] bg-surface-tertiary border-border-card"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-fg-muted">Speed Limit (Mbps)</label>
            <Input
              type="number" min={0} step={1}
              value={speedLimit}
              onChange={(e) => setSpeedLimit(parseFloat(e.target.value) || 0)}
              placeholder="0 = unlimited"
              className="h-10 text-[13px] bg-surface-tertiary border-border-card"
            />
            <p className="text-[10px] text-fg-muted">0 = unlimited</p>
          </div>
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-blue text-white text-[13px] font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            disabled={submitting}
            onClick={handleSchedule}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            {submitting ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
