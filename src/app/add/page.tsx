"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Magnet, Link2, Download, Cloud, Clock, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProviders } from "@/hooks/use-providers";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Category } from "@/lib/types";

function detectType(source: string): "magnet" | "rd-link" | "url" | null {
  if (source.startsWith("magnet:")) return "magnet";
  if (source.includes("real-debrid.com/d/")) return "rd-link";
  if (source.startsWith("http://") || source.startsWith("https://")) return "url";
  return null;
}

function toLocalDatetime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AddPage() {
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<Category>("movies");
  const [provider, setProvider] = useState("realdebrid");
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const tomorrow4am = new Date();
    tomorrow4am.setDate(tomorrow4am.getDate() + 1);
    tomorrow4am.setHours(4, 0, 0, 0);
    return toLocalDatetime(tomorrow4am);
  });
  const [speedLimit, setSpeedLimit] = useState(0);
  const router = useRouter();
  const { providers, hasMultiple } = useProviders();

  const type = source.trim() ? detectType(source.trim()) : null;

  const handleSubmit = async () => {
    if (!source.trim() || !type) {
      toast.error("Paste a magnet link, RD link, or URL");
      return;
    }
    setSubmitting(true);
    try {
      if (scheduled) {
        const scheduledAt = new Date(scheduleDate).toISOString();
        await api.createSchedule(source.trim(), category, scheduledAt, speedLimit, undefined, undefined, provider);
        toast.success("Download scheduled!");
        setSource("");
        router.push("/schedule");
      } else {
        await api.startDownload(source.trim(), category, undefined, provider);
        toast.success("Download started!");
        setSource("");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold">Add Download</h1>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste link</label>
              <Input
                placeholder="magnet:?xt=... or real-debrid.com/d/... or any URL"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-12 text-sm"
              />
              {type && (
                <div className="flex items-center gap-2">
                  {type === "magnet" && <><Magnet className="h-3.5 w-3.5 text-blue-400" /><Badge variant="outline" className="text-[10px]">Magnet Link</Badge></>}
                  {type === "rd-link" && <><Link2 className="h-3.5 w-3.5 text-green-400" /><Badge variant="outline" className="text-[10px]">RD Download Link</Badge></>}
                  {type === "url" && <><Download className="h-3.5 w-3.5 text-yellow-400" /><Badge variant="outline" className="text-[10px]">Direct URL</Badge></>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={category === "movies" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setCategory("movies")}
                >
                  Movies
                </Button>
                <Button
                  variant={category === "tv-shows" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setCategory("tv-shows")}
                >
                  TV Shows
                </Button>
                <Button
                  variant={category === "music" ? "default" : "outline"}
                  className="h-12"
                  onClick={() => setCategory("music")}
                >
                  Music
                </Button>
              </div>
            </div>

            {hasMultiple && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p) => (
                    <Button
                      key={p.name}
                      variant={provider === p.name ? "default" : "outline"}
                      className={`h-12 ${provider === p.name && p.name === "torbox" ? "bg-teal-500 hover:bg-teal-600 text-white" : ""}`}
                      onClick={() => setProvider(p.name)}
                    >
                      {p.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule toggle */}
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setScheduled(!scheduled)}
            >
              <div className={`h-5 w-9 rounded-full transition-colors relative ${scheduled ? "bg-primary" : "bg-muted"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${scheduled ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Schedule for later</span>
            </div>

            {scheduled && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
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
              </div>
            )}

            <Button
              className="w-full h-12"
              disabled={!source.trim() || !type || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (scheduled ? "Scheduling..." : "Starting...") : (
                scheduled ? (
                  <><CalendarClock className="mr-2 h-4 w-4" /> Schedule Download</>
                ) : (
                  "Download"
                )
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={() => router.push("/cloud")}>
            <Cloud className="mr-2 h-4 w-4" /> Cloud
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/schedule")}>
            <CalendarClock className="mr-2 h-4 w-4" /> Schedules
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
