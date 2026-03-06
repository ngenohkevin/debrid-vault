"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  onScheduled?: () => void;
}

export function ScheduleDialog({ open, onOpenChange, source, category, folder, name, onScheduled }: ScheduleDialogProps) {
  const [scheduleDate, setScheduleDate] = useState(defaultScheduleDate);
  const [speedLimit, setSpeedLimit] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSchedule = async () => {
    setSubmitting(true);
    try {
      const scheduledAt = new Date(scheduleDate).toISOString();
      await api.createSchedule(source, category, scheduledAt, speedLimit, folder);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Schedule Download</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {name && (
            <p className="text-sm text-muted-foreground line-clamp-2">{name}</p>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date & Time</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Speed Limit (Mbps)</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={speedLimit}
              onChange={(e) => setSpeedLimit(parseFloat(e.target.value) || 0)}
              placeholder="0 = unlimited"
              className="h-10 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">0 = unlimited. Sets global speed limit while this download runs.</p>
          </div>
          <Button
            className="w-full h-10"
            disabled={submitting}
            onClick={handleSchedule}
          >
            {submitting ? "Scheduling..." : (
              <><CalendarClock className="mr-2 h-4 w-4" /> Schedule</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
