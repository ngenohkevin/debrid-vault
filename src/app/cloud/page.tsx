"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Download, Loader2, ChevronDown, ChevronRight, Film, Tv, Music2, HardDrive, Search, X, CalendarClock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleDialog } from "@/components/downloads/schedule-dialog";
import { SubtitleBadge } from "@/components/downloads/subtitle-badge";
import { ProviderToggle } from "@/components/provider-toggle";
import { useProviders } from "@/hooks/use-providers";
import type { RDTorrent, RDTorrentFile, Category } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function TorrentCard({
  torrent,
  onDownload,
  onSchedule,
  downloading,
  provider,
}: {
  torrent: RDTorrent;
  onDownload: (torrent: RDTorrent, fileNames: string[], linkIndex?: number) => void;
  onSchedule: (torrent: RDTorrent, linkIndex?: number) => void;
  downloading: string | null;
  provider?: string;
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
        const info = await api.getRDTorrentInfo(torrent.id, provider);
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

  const getFileNames = (): string[] => files.map((f) => getFileName(f.path));

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div
        className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => isMultiFile && handleExpand()}
      >
        <div className="mt-0.5 shrink-0">
          {isMusicTorrent(torrent) ? (
            <Music2 className="h-4 w-4 text-green-400" />
          ) : isMultiFile ? (
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

        <div className="flex items-center gap-0.5 shrink-0">
          {!isMultiFile && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                disabled={isDownloading}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(torrent, getFileNames(), 0);
                }}
                title="Download now"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedule(torrent, 0);
                }}
                title="Schedule"
              >
                <CalendarClock className="h-3.5 w-3.5" />
              </Button>
            </>
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
          <div className="max-h-72 overflow-y-auto">
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
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={downloading === `${torrent.id}-${i}`}
                    onClick={() => onDownload(torrent, [getFileName(file.path)], i)}
                    title="Download now"
                  >
                    {downloading === `${torrent.id}-${i}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => onSchedule(torrent, i)}
                    title="Schedule"
                  >
                    <CalendarClock className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {!loadingFiles && files.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No files found</p>
            )}
          </div>
          {!loadingFiles && files.length > 0 && (
            <div className="border-t border-border/40 px-3.5 py-2.5 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-8 text-xs gap-1.5"
                disabled={isDownloading}
                onClick={() => onDownload(torrent, getFileNames())}
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Download All
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => onSchedule(torrent)}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Schedule All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type FilterType = "all" | "movies" | "tv" | "music";

const musicPattern = /\.(flac|alac|wav|ape|dsd|dsf|dff|mp3|aac|ogg|opus|m4a|wma|aiff?)$/i;
const musicKeywords = /\b(flac|lossless|hi-?res|sacd|dsd|vinyl rip|24bit|24-bit|16bit|16-bit|320\s*kbps|mp3)\b/i;

function isMusicTorrent(torrent: RDTorrent): boolean {
  return musicPattern.test(torrent.filename) || musicKeywords.test(torrent.filename);
}

export default function CloudPage() {
  const [torrents, setTorrents] = useState<RDTorrent[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [provider, setProvider] = useState("realdebrid");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSource, setScheduleSource] = useState("");
  const [scheduleCategory, setScheduleCategory] = useState<Category>("movies");
  const [scheduleFolder, setScheduleFolder] = useState<string | undefined>();
  const [scheduleName, setScheduleName] = useState<string | undefined>();
  const { providers, hasMultiple } = useProviders();
  const router = useRouter();

  const fetchTorrents = (prov: string) => {
    setLoading(true);
    api
      .getRDTorrents(prov)
      .then((t) => setTorrents(t.filter((t) => t.status === "downloaded")))
      .catch(() => toast.error("Failed to load cloud"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTorrents(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    fetchTorrents(p);
  };

  const filtered = useMemo(() => {
    let result = torrents;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.filename.toLowerCase().includes(q));
    }
    if (filter === "music") {
      result = result.filter((t) => isMusicTorrent(t));
    } else if (filter === "movies") {
      result = result.filter((t) => t.links.length === 1 && !isMusicTorrent(t));
    } else if (filter === "tv") {
      result = result.filter((t) => t.links.length > 1 && !isMusicTorrent(t));
    }
    return result;
  }, [torrents, search, filter]);

  const totalSize = useMemo(
    () => torrents.reduce((acc, t) => acc + t.bytes, 0),
    [torrents]
  );

  const handleDownload = async (torrent: RDTorrent, fileNames: string[], linkIndex?: number) => {
    const dlId = linkIndex !== undefined ? `${torrent.id}-${linkIndex}` : torrent.id;
    setDownloading(dlId);

    const isMulti = torrent.links.length > 1;
    const category: Category = isMusicTorrent(torrent) ? "music" : isMulti ? "tv-shows" : "movies";

    try {
      if (linkIndex !== undefined) {
        const link = torrent.links[linkIndex];
        const folder = isMulti ? torrent.filename : undefined;
        await api.startDownload(link, category, folder, provider);
        const name = fileNames[0] || `file ${linkIndex + 1}`;
        toast.success(`Started: ${name}`);
      } else {
        await api.startBatchDownload(torrent.links, torrent.filename, category, provider);
        toast.success(`Started all ${torrent.links.length} episodes`);
      }
      router.push("/");
    } catch {
      toast.error("Failed to start download");
    } finally {
      setDownloading(null);
    }
  };

  const handleSchedule = (torrent: RDTorrent, linkIndex?: number) => {
    const isMulti = torrent.links.length > 1;
    const itemLabel = isMusicTorrent(torrent) ? "tracks" : "episodes";
    setScheduleCategory(isMusicTorrent(torrent) ? "music" : isMulti ? "tv-shows" : "movies");
    if (linkIndex !== undefined) {
      setScheduleSource(torrent.links[linkIndex]);
      setScheduleFolder(isMulti ? torrent.filename : undefined);
      setScheduleName(torrent.filename + (isMulti ? ` (${itemLabel} ${linkIndex + 1})` : ""));
    } else {
      // Schedule All — join all links so the dialog can create one schedule per file
      setScheduleSource(torrent.links.join("\n"));
      setScheduleFolder(torrent.filename);
      setScheduleName(torrent.filename + ` (${torrent.links.length} ${itemLabel})`);
    }
    setScheduleOpen(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    api.invalidateRDCache(provider)
      .then(() => api.getRDTorrents(provider))
      .then((t) => setTorrents(t.filter((t) => t.status === "downloaded")))
      .catch(() => toast.error("Failed to refresh"))
      .finally(() => setLoading(false));
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Cloud</h1>
            {hasMultiple && (
              <ProviderToggle providers={providers} selected={provider} onChange={handleProviderChange} />
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground -mt-2">
            {torrents.length} torrents &middot; {formatBytes(totalSize)}
          </p>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search torrents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters & Category */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "movies", "tv", "music"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {f === "tv" ? "TV Shows" : f === "movies" ? "Movies" : f === "music" ? "Music" : "All"}
              </button>
            ))}
          </div>

        </div>

        {/* Results count */}
        {!loading && search && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* Torrent list */}
        <div className="space-y-2">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          {!loading &&
            filtered.map((torrent) => (
              <TorrentCard
                key={torrent.id}
                torrent={torrent}
                onDownload={handleDownload}
                onSchedule={handleSchedule}
                downloading={downloading}
                provider={provider}
              />
            ))}
          {!loading && filtered.length === 0 && torrents.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Search className="h-8 w-8" />
              <p className="text-sm">No matching torrents</p>
              <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs text-primary hover:underline">
                Clear filters
              </button>
            </div>
          )}
          {!loading && torrents.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Cloud className="h-8 w-8" />
              <p className="text-sm">No torrents in your cloud</p>
            </div>
          )}
        </div>
      </div>

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        source={scheduleSource}
        category={scheduleCategory}
        folder={scheduleFolder}
        name={scheduleName}
        provider={provider}
        onScheduled={() => router.push("/schedule")}
      />
    </AppShell>
  );
}
