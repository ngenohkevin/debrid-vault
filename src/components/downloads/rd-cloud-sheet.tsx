"use client";

import { useState, useEffect } from "react";
import { Cloud, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { RDDownload, Category } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function RDCloudSheet() {
  const [open, setOpen] = useState(false);
  const [downloads, setDownloads] = useState<RDDownload[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>("movies");

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.getRDDownloads(50).then(setDownloads).catch(() => toast.error("Failed to load RD cloud")).finally(() => setLoading(false));
    }
  }, [open]);

  const handleDownload = async (item: RDDownload) => {
    try {
      await api.startDownload(item.link, category);
      toast.success(`Started: ${item.filename}`);
    } catch {
      toast.error("Failed to start download");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <Cloud className="mr-2 h-4 w-4" /> Browse RD Cloud
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle>Real-Debrid Cloud</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-2 my-4">
          <span className="text-sm text-muted-foreground">Download as:</span>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="movies">Movies</SelectItem>
              <SelectItem value="tv-shows">TV Shows</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[calc(85vh-140px)]">
          <div className="space-y-2 pr-4">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
            {!loading && downloads.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{formatBytes(item.filesize)}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDate(item.generated)}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => handleDownload(item)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!loading && downloads.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No downloads in your RD cloud</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
