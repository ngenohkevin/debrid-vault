"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Magnet, Link2, Download } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RDCloudSheet } from "@/components/downloads/rd-cloud-sheet";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Category } from "@/lib/types";

function detectType(source: string): "magnet" | "rd-link" | "url" | null {
  if (source.startsWith("magnet:")) return "magnet";
  if (source.includes("real-debrid.com/d/")) return "rd-link";
  if (source.startsWith("http://") || source.startsWith("https://")) return "url";
  return null;
}

export default function AddPage() {
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<Category>("movies");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const type = source.trim() ? detectType(source.trim()) : null;

  const handleSubmit = async () => {
    if (!source.trim() || !type) {
      toast.error("Paste a magnet link, RD link, or URL");
      return;
    }
    setSubmitting(true);
    try {
      await api.startDownload(source.trim(), category);
      toast.success("Download started!");
      setSource("");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start download");
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
              <div className="grid grid-cols-2 gap-2">
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
              </div>
            </div>

            <Button
              className="w-full h-12"
              disabled={!source.trim() || !type || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Starting..." : "Download"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <RDCloudSheet />
      </div>
    </AppShell>
  );
}
