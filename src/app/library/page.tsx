"use client";

import { useState, useEffect } from "react";
import { Film, Tv, Music2, Trash2, Search, X, ArrowRightLeft, FolderOpen, HardDrive, Subtitles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StorageCards } from "@/components/library/storage-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { MediaFile } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/formatters";
import { useStorage } from "@/hooks/use-storage";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatSubtitleTracks(tracks?: import("@/lib/types").SubtitleTrack[]): string {
  if (!tracks || tracks.length === 0) return "Subs";
  const langs = [...new Set(tracks.map((t) => t.language?.toUpperCase() || "UND"))];
  return langs.join(", ");
}

type FilterType = "all" | "movies" | "tv-shows" | "music";

export default function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const { storage } = useStorage();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const category = filter === "all" ? undefined : filter;
      const data = search
        ? await api.searchLibrary(search)
        : await api.getLibrary(category);
      setFiles(data);
    } catch {
      toast.error("Failed to load library");
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFiles(); }, [filter, search]);

  const handleMove = async (file: MediaFile) => {
    const target = file.category === "movies" ? "tv-shows" : "movies";
    try {
      await api.moveMedia(file.path, target);
      toast.success(`Moved to ${target}`);
      fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move");
    }
  };

  const handleDelete = async (file: MediaFile) => {
    try {
      await api.deleteMedia(file.path);
      toast.success(`Deleted: ${file.name}`);
      fetchFiles();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Library</h1>
            {!loading && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <StorageCards storage={storage} />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
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

        {/* Filter */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "movies", "tv-shows", "music"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {f === "tv-shows" ? "TV Shows" : f === "movies" ? "Movies" : f === "music" ? "Music" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {!loading && search && (
          <p className="text-xs text-muted-foreground">
            {files.length} result{files.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.path} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                <div className="flex items-start gap-3 p-3.5">
                  <div className="mt-0.5 shrink-0">
                    {file.category === "movies" ? (
                      <Film className="h-4 w-4 text-blue-400" />
                    ) : file.category === "music" ? (
                      <Music2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Tv className="h-4 w-4 text-purple-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{file.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                        <HardDrive className="h-2.5 w-2.5" />
                        {formatBytes(file.size)}
                      </Badge>
                      {!file.isDir && file.hasSubtitles !== undefined && (
                        file.hasSubtitles ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
                            <Subtitles className="h-2.5 w-2.5" />
                            {formatSubtitleTracks(file.subtitleTracks)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
                            <Subtitles className="h-2.5 w-2.5" />
                            No subs
                          </span>
                        )
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(file.modTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {file.category !== "music" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={`Move to ${file.category === "movies" ? "TV Shows" : "Movies"}`}
                        onClick={() => handleMove(file)}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete file?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{file.name}&quot;. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(file)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <FolderOpen className="h-8 w-8" />
                <p className="text-sm">No media files found</p>
                {search && (
                  <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-xs text-primary hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
