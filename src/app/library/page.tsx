"use client";

import { useState, useEffect } from "react";
import { Trash2, Search, X, FolderOpen, Subtitles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { QualityTags } from "@/components/quality-tags";
import type { MediaFile, Category } from "@/lib/types";
import { formatBytes } from "@/lib/formatters";
import { useStorage } from "@/hooks/use-storage";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatSubtitleLangs(tracks?: import("@/lib/types").SubtitleTrack[]): string {
  if (!tracks || tracks.length === 0) return "";
  return [...new Set(tracks.map((t) => t.language?.toUpperCase() || "UND"))].join(", ");
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type FilterType = "all" | "movies" | "tv-shows" | "music";

export default function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const { storage } = useStorage();

  const loadFiles = (f: FilterType, q: string) => {
    setLoading(true);
    const category = f === "all" ? undefined : f;
    const promise = q ? api.searchLibrary(q) : api.getLibrary(category);
    promise.then((data) => setFiles(data)).catch(() => toast.error("Failed to load library")).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadFiles(filter, search); }, [filter, search]);

  const handleDelete = async (file: MediaFile) => {
    try { await api.deleteMedia(file.path); toast.success(`Deleted: ${file.name}`); loadFiles(filter, search); }
    catch { toast.error("Failed to delete"); }
  };

  const nvmeGB = storage ? `${Math.round(storage.nvme.used / (1024 ** 3))} / ${Math.round(storage.nvme.total / (1024 ** 3))} GB` : "";
  const extGB = storage ? `${Math.round(storage.external.used / (1024 ** 3))} / ${Math.round(storage.external.total / (1024 ** 3))} GB` : "";

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "movies", label: "Movies" },
    { value: "tv-shows", label: "TV Shows" },
    { value: "music", label: "Music" },
  ];

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5 max-w-2xl mx-auto">
        <PageHeader title="Library" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input placeholder="Search media..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-secondary border border-border-card text-[13px] text-fg-primary placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent-blue" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary"><X className="h-4 w-4" /></button>}
        </div>

        {/* Storage bars */}
        {storage && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-secondary border border-border-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-fg-secondary">NVMe</span>
                <span className="text-[10px] font-mono text-fg-muted">{nvmeGB}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${storage.nvme.percent}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-surface-secondary border border-border-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-fg-secondary">External</span>
                <span className="text-[10px] font-mono text-fg-muted">{extGB}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                <div className="h-full rounded-full bg-accent-amber transition-all" style={{ width: `${storage.external.percent}%` }} />
              </div>
            </div>
          </div>
        )}

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

        {/* File count */}
        {!loading && <p className="text-[11px] text-fg-muted">{files.length} files</p>}

        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[68px] w-full rounded-2xl bg-surface-secondary" />)}
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.path} className="flex items-center gap-3 py-3 px-1">
                <CategoryIcon category={file.category as Category} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-fg-primary truncate">{file.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono text-fg-muted">{formatBytes(file.size)}</span>
                    <QualityTags name={file.name} />
                    {file.hasSubtitles && file.subtitleTracks && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">
                        <Subtitles className="h-2.5 w-2.5" /> {formatSubtitleLangs(file.subtitleTracks)}
                      </span>
                    )}
                    <span className="text-[10px] text-fg-muted">{formatShortDate(file.modTime)}</span>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-lg text-fg-muted hover:text-accent-red hover:bg-surface-tertiary transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-surface-secondary border-border-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-fg-primary">Delete file?</AlertDialogTitle>
                      <AlertDialogDescription className="text-fg-secondary">
                        This will permanently delete &quot;{file.name}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border-card">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(file)} className="bg-accent-red hover:bg-accent-red/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {files.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
                <FolderOpen className="h-10 w-10" />
                <p className="text-sm font-medium">No media files found</p>
                {search && <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs text-accent-blue hover:underline">Clear filters</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
