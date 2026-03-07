"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(4, 0, 0, 0);
  return toLocalDatetime(d);
}

export function useScheduleLater() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function ScheduleLaterToggle({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${open ? "text-blue-400" : "text-muted-foreground"}`}
      onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      title="Schedule for later"
    >
      <CalendarClock className="h-3.5 w-3.5" />
    </Button>
  );
}

export function ScheduleLaterForm({
  downloadId,
  groupId,
  onScheduled,
  onCancel,
}: {
  downloadId: string;
  groupId?: string;
  onScheduled: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(defaultScheduleTime);
  const [speed, setSpeed] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSchedule = async () => {
    setSaving(true);
    try {
      const scheduledAt = new Date(date).toISOString();
      if (groupId) {
        await api.scheduleExistingGroup(groupId, scheduledAt, speed);
      } else {
        await api.scheduleExisting(downloadId, scheduledAt, speed);
      }
      toast.success("Scheduled for later");
      onScheduled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">Resume at</label>
        <Input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 text-xs"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-medium text-muted-foreground">Speed Limit (Mbps)</label>
        <Input
          type="number"
          min={0}
          step={1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value) || 0)}
          placeholder="0 = unlimited"
          className="h-9 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs" disabled={saving} onClick={handleSchedule}>
          {saving ? "Scheduling..." : "Schedule"}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
