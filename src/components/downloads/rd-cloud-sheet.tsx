"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Download, Loader2, ChevronDown, ChevronRight, Film, Tv, Music2, HardDrive, Subtitles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { RDTorrent, RDTorrentFile, Category } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { SubtitleBadge } from "./subtitle-badge";

function getFileName(path: string): string {
  // RD file paths look like "/Trigger.Point.S02E01.720p.mkv" or "Trigger.Point.S02E01.720p.mkv"
  const name = path.split("/").pop() || path;
  return name;
}

function TorrentCard({
  torrent,
  onDownload,
  downloading,
}: {
  torrent: RDTorrent;
  onDownload: (torrent: RDTorrent, fileNames: string[], linkIndex?: number) => void;
  downloading: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<RDTorrentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileCount = torrent.links.length;
  const isMultiFile = fileCount > 1;
  const isDownloading = downloading === torrent.id;

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (files.length === 0) {
      setLoadingFiles(true);
      try {
        const info = await api.getRDTorrentInfo(torrent.id);
        // Only keep selected files (selected === 1) — these match the links array
        const selected = info.files.filter((f) => f.selected === 1);
        setFiles(selected);
      } catch {
        toast.error("Failed to load file details");
      } finally {
        setLoadingFiles(false);
      }
    }
    setExpanded(true);
  };

  // Get file names for toast messages
  const getFileNames = (): string[] => files.map((f) => getFileName(f.path));

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div
        className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => isMultiFile && handleExpand()}
      >
        <div className="mt-0.5 shrink-0">
          {isMultiFile ? (
            <Tv className="h-4 w-4 text-purple-400" />
          ) : (
            <Film className="h-4 w-4 text-blue-400" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-snug line-clamp-2">{torrent.filename}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] font-normal gap-1">
              <HardDrive className="h-2.5 w-2.5" />
              {formatBytes(torrent.bytes)}
            </Badge>
            {isMultiFile && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {fileCount} episodes
              </Badge>
            )}
            <SubtitleBadge status={torrent.subtitleStatus} />
            <span className="text-[10px] text-muted-foreground">
              {formatDate(torrent.added)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isMultiFile && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={isDownloading}
              onClick={(e) => {
                e.stopPropagation();
                onDownload(torrent, getFileNames(), 0);
              }}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          )}
          {isMultiFile && (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      </div>

      {expanded && isMultiFile && (
        <div className="border-t border-border/40 bg-muted/20">
          <div className="max-h-64 overflow-y-auto">
            {loadingFiles && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingFiles && files.map((file, i) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs hover:bg-accent/20 transition-colors border-b border-border/20 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{getFileName(file.path)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatBytes(file.bytes)}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  disabled={downloading === `${torrent.id}-${i}`}
                  onClick={() => onDownload(torrent, [getFileName(file.path)], i)}
                >
                  {downloading === `${torrent.id}-${i}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
            {!loadingFiles && files.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No files found</p>
            )}
          </div>
          {!loadingFiles && files.length > 0 && (
            <div className="border-t border-border/40 px-3.5 py-2.5">
              <Button
                size="sm"
                variant="secondary"
                className="w-full h-8 text-xs gap-1.5"
                disabled={isDownloading}
                onClick={() => onDownload(torrent, getFileNames())}
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Download All {files.length} Episodes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RDCloudSheet() {
  const [open, setOpen] = useState(false);
  const [torrents, setTorrents] = useState<RDTorrent[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>("movies");
  const [downloading, setDownloading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setLoading(true);
      api
        .getRDTorrents()
        .then((t) => setTorrents(t.filter((t) => t.status === "downloaded")))
        .catch(() => toast.error("Failed to load RD cloud"))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleDownload = async (torrent: RDTorrent, fileNames: string[], linkIndex?: number) => {
    const dlId = linkIndex !== undefined ? `${torrent.id}-${linkIndex}` : torrent.id;
    setDownloading(dlId);

    const isMulti = torrent.links.length > 1;

    try {
      if (linkIndex !== undefined) {
        const link = torrent.links[linkIndex];
        const folder = isMulti ? torrent.filename : undefined;
        await api.startDownload(link, category, folder);
        const name = fileNames[0] || `file ${linkIndex + 1}`;
        toast.success(`Started: ${name}`);
      } else {
        await api.startBatchDownload(torrent.links, torrent.filename, category);
        toast.success(`Started all ${torrent.links.length} episodes`);
      }
      setOpen(false);
      router.push("/");
    } catch {
      toast.error("Failed to start download");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <Cloud className="mr-2 h-4 w-4" /> Browse RD Cloud
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle>Real-Debrid Cloud</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 my-3 shrink-0">
          <span className="text-sm text-muted-foreground">Save as:</span>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movies">
                <span className="flex items-center gap-1.5"><Film className="h-3.5 w-3.5" /> Movies</span>
              </SelectItem>
              <SelectItem value="tv-shows">
                <span className="flex items-center gap-1.5"><Tv className="h-3.5 w-3.5" /> TV Shows</span>
              </SelectItem>
              <SelectItem value="music">
                <span className="flex items-center gap-1.5"><Music2 className="h-3.5 w-3.5" /> Music</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {!loading && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {torrents.length} torrents
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2 pb-4">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
              ))}
            {!loading &&
              torrents.map((torrent) => (
                <TorrentCard
                  key={torrent.id}
                  torrent={torrent}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              ))}
            {!loading && torrents.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Cloud className="h-8 w-8" />
                <p className="text-sm">No torrents in your RD cloud</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
