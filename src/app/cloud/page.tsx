"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Cloud, Download, Loader2, ChevronDown, ChevronUp, Search, X, CalendarClock, Check, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleDialog } from "@/components/downloads/schedule-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { QualityTags } from "@/components/quality-tags";
import { useProviders } from "@/hooks/use-providers";
import type { RDTorrent, RDTorrentFile, Category } from "@/lib/types";
import { formatBytes } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getFileName(path: string): string { return path.split("/").pop() || path; }

const musicPattern = /\.(flac|alac|wav|ape|dsd|dsf|dff|mp3|aac|ogg|opus|m4a|wma|aiff?)$/i;
const musicKeywords = /\b(flac|lossless|hi-?res|sacd|dsd|vinyl rip|24bit|24-bit|16bit|16-bit|320\s*kbps|mp3)\b/i;
function isMusicTorrent(t: RDTorrent): boolean { return musicPattern.test(t.filename) || musicKeywords.test(t.filename); }
function getCategory(t: RDTorrent): Category { return isMusicTorrent(t) ? "music" : t.links.length > 1 ? "tv-shows" : "movies"; }

type FilterType = "all" | "movies" | "tv" | "music";

function TorrentCard({ torrent, onDownload, onSchedule, downloading, provider, downloadedSources }: {
  torrent: RDTorrent; onDownload: (t: RDTorrent, names: string[], idx?: number) => void; onSchedule: (t: RDTorrent, idx?: number) => void;
  downloading: string | null; provider?: string; downloadedSources: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<RDTorrentFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const category = getCategory(torrent);
  const isMulti = torrent.links.length > 1;
  const dlCount = torrent.links.filter((l) => downloadedSources.has(l)).length;
  const isFullyDownloaded = dlCount === torrent.links.length && dlCount > 0;
  const isDownloading = downloading === torrent.id;

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    if (files.length === 0) {
      setLoadingFiles(true);
      try { const info = await api.getRDTorrentInfo(torrent.id, provider); setFiles(info.files.filter((f) => f.selected === 1)); }
      catch { toast.error("Failed to load files"); }
      finally { setLoadingFiles(false); }
    }
    setExpanded(true);
  };

  const getFileNames = (): string[] => files.map((f) => getFileName(f.path));

  return (
    <div className="rounded-2xl border border-border-card bg-surface-secondary overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => isMulti && handleExpand()}>
        <div className="flex items-start gap-3">
          <CategoryIcon category={category} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg-primary line-clamp-2">{torrent.filename}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[9px] font-mono text-fg-muted">{formatBytes(torrent.bytes)}</span>
              <QualityTags name={torrent.filename} />
              {isMulti && <span className="text-[9px] text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">{torrent.links.length} files</span>}
              {isFullyDownloaded && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-accent-green">
                  <Check className="h-2.5 w-2.5" /> Downloaded
                </span>
              )}
            </div>
          </div>
          {isMulti ? (
            expanded ? <ChevronUp className="h-5 w-5 text-fg-muted shrink-0 mt-1" /> : <ChevronDown className="h-5 w-5 text-fg-muted shrink-0 mt-1" />
          ) : null}
        </div>

        {/* Single file actions */}
        {!isMulti && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(torrent, getFileNames(), 0); }}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[11px] font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
            >
              {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSchedule(torrent, 0); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors"
            >
              <CalendarClock className="h-3 w-3" /> Schedule
            </button>
          </div>
        )}
      </div>

      {/* Expanded file list */}
      {expanded && isMulti && (
        <div className="border-t border-border-card">
          <div className="max-h-80 overflow-y-auto scrollbar-none">
            {loadingFiles && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-fg-muted" /></div>}
            {!loadingFiles && files.map((file, i) => (
              <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-tertiary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] text-fg-primary truncate">{getFileName(file.path)}</p>
                    {downloadedSources.has(torrent.links[i]) && <Check className="h-3 w-3 text-accent-green shrink-0" />}
                  </div>
                  <p className="text-[10px] font-mono text-fg-muted">{formatBytes(file.bytes)}</p>
                </div>
                <button
                  onClick={() => onDownload(torrent, [getFileName(file.path)], i)}
                  disabled={downloading === `${torrent.id}-${i}`}
                  className="p-1.5 rounded-lg text-fg-muted hover:text-accent-blue hover:bg-surface-tertiary transition-colors shrink-0"
                >
                  {downloading === `${torrent.id}-${i}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
          {!loadingFiles && files.length > 0 && (
            <div className="border-t border-border-card px-4 py-3 flex gap-2">
              <button
                onClick={() => onDownload(torrent, getFileNames())}
                disabled={isDownloading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent-blue text-white text-[11px] font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
              >
                {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download All
              </button>
              <button
                onClick={() => onSchedule(torrent)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-border-card text-[11px] text-fg-secondary hover:bg-surface-tertiary transition-colors"
              >
                <CalendarClock className="h-3 w-3" /> Schedule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  const [downloadedSources, setDownloadedSources] = useState<Set<string>>(new Set());
  const { providers, hasMultiple } = useProviders();
  const router = useRouter();

  const fetchTorrents = (prov: string) => {
    setLoading(true);
    api.getRDTorrents(prov).then((t) => setTorrents(t.filter((t) => t.status === "downloaded"))).catch(() => toast.error("Failed to load cloud")).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTorrents(provider); api.getCompletedSources().then((s) => setDownloadedSources(new Set(s))).catch(() => {}); }, [provider]);

  const handleProviderChange = (p: string) => { setProvider(p); fetchTorrents(p); };

  const filtered = useMemo(() => {
    let result = torrents;
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((t) => t.filename.toLowerCase().includes(q)); }
    if (filter === "music") result = result.filter(isMusicTorrent);
    else if (filter === "movies") result = result.filter((t) => t.links.length === 1 && !isMusicTorrent(t));
    else if (filter === "tv") result = result.filter((t) => t.links.length > 1 && !isMusicTorrent(t));
    return result;
  }, [torrents, search, filter]);

  const handleDownload = async (torrent: RDTorrent, fileNames: string[], linkIndex?: number) => {
    const dlId = linkIndex !== undefined ? `${torrent.id}-${linkIndex}` : torrent.id;
    setDownloading(dlId);
    const category = getCategory(torrent);
    try {
      if (linkIndex !== undefined) {
        await api.startDownload(torrent.links[linkIndex], category, torrent.links.length > 1 ? torrent.filename : undefined, provider);
        toast.success(`Started: ${fileNames[0] || `file ${linkIndex + 1}`}`);
      } else {
        await api.startBatchDownload(torrent.links, torrent.filename, category, provider);
        toast.success(`Started all ${torrent.links.length} files`);
      }
      router.push("/");
    } catch { toast.error("Failed to start download"); }
    finally { setDownloading(null); }
  };

  const handleSchedule = (torrent: RDTorrent, linkIndex?: number) => {
    const isMulti = torrent.links.length > 1;
    setScheduleCategory(getCategory(torrent));
    if (linkIndex !== undefined) {
      setScheduleSource(torrent.links[linkIndex]);
      setScheduleFolder(isMulti ? torrent.filename : undefined);
      setScheduleName(torrent.filename);
    } else {
      setScheduleSource(torrent.links.join("|"));
      setScheduleFolder(torrent.filename);
      setScheduleName(`${torrent.filename} (${torrent.links.length} files)`);
    }
    setScheduleOpen(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    api.invalidateRDCache(provider).then(() => api.getRDTorrents(provider)).then((t) => setTorrents(t.filter((t) => t.status === "downloaded"))).catch(() => toast.error("Refresh failed")).finally(() => setLoading(false));
  };

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "movies", label: "Movies" },
    { value: "tv", label: "TV Shows" },
    { value: "music", label: "Music" },
  ];

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5 max-w-2xl mx-auto">
        <PageHeader title="Cloud">
          {hasMultiple && (
            <div className="flex rounded-xl overflow-hidden border border-border-card">
              {providers.map((p) => (
                <button key={p.name} onClick={() => handleProviderChange(p.name)}
                  className={cn("px-3 py-1.5 text-[12px] font-medium transition-colors", provider === p.name ? "bg-accent-blue text-white" : "text-fg-secondary hover:bg-surface-secondary")}>
                  {p.displayName}
                </button>
              ))}
            </div>
          )}
          <button onClick={handleRefresh} disabled={loading} className="p-2 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-secondary transition-colors">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </PageHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input placeholder="Search cloud files..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-secondary border border-border-card text-[13px] text-fg-primary placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent-blue" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"><X className="h-4 w-4" /></button>}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn("px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                filter === f.value ? "bg-accent-blue text-white" : "bg-surface-secondary text-fg-secondary hover:bg-surface-tertiary border border-border-card")}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Torrent list */}
        <div className="space-y-2.5">
          {loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[88px] w-full rounded-2xl bg-surface-secondary" />)}
          {!loading && filtered.map((t) => (
            <TorrentCard key={t.id} torrent={t} onDownload={handleDownload} onSchedule={handleSchedule} downloading={downloading} provider={provider} downloadedSources={downloadedSources} />
          ))}
          {!loading && filtered.length === 0 && torrents.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
              <Search className="h-10 w-10" />
              <p className="text-sm">No matching files</p>
              <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs text-accent-blue hover:underline">Clear filters</button>
            </div>
          )}
          {!loading && torrents.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
              <Cloud className="h-10 w-10" />
              <p className="text-sm font-medium">No torrents in cloud</p>
            </div>
          )}
        </div>
      </div>

      <ScheduleDialog open={scheduleOpen} onOpenChange={setScheduleOpen} source={scheduleSource} category={scheduleCategory} folder={scheduleFolder} name={scheduleName} provider={provider} onScheduled={() => router.push("/schedule")} />
    </AppShell>
  );
}
