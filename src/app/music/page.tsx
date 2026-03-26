"use client";

import { useState, useRef } from "react";
import { Search, X, Music2, Disc3, Download, User, Clock, Sparkles, ChevronLeft, Loader2, CalendarClock, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MusicTrack, MusicAlbum, MusicArtist, MusicDiscography } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

type View = "search" | "album" | "artist";
type SearchType = "track" | "album" | "artist";

export default function MusicPage() {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("track");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [albums, setAlbums] = useState<MusicAlbum[]>([]);
  const [artists, setArtists] = useState<MusicArtist[]>([]);

  const [view, setView] = useState<View>("search");
  const [selectedAlbum, setSelectedAlbum] = useState<MusicAlbum | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<MusicDiscography | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [downloadingTracks, setDownloadingTracks] = useState<Set<string>>(new Set());
  const [downloadingAlbums, setDownloadingAlbums] = useState<Set<string>>(new Set());

  // Batch selection
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [batchDownloading, setBatchDownloading] = useState(false);

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks((s) => {
      const next = new Set(s);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const selectAllTracks = () => {
    const allIds = (view === "album" && selectedAlbum?.tracks)
      ? selectedAlbum.tracks.map((t) => t.id)
      : tracks.map((t) => t.id);
    setSelectedTracks((s) => s.size === allIds.length ? new Set() : new Set(allIds));
  };

  const batchDownload = async () => {
    if (selectedTracks.size === 0) return;
    setBatchDownloading(true);
    const trackList = view === "album" && selectedAlbum?.tracks
      ? selectedAlbum.tracks.filter((t) => selectedTracks.has(t.id))
      : tracks.filter((t) => selectedTracks.has(t.id));
    let success = 0;
    for (const track of trackList) {
      try {
        const idx = selectedAlbum?.tracks
          ? selectedAlbum.tracks.findIndex((t) => t.id === track.id) + 1
          : 1;
        await api.musicDownloadTrack({
          trackId: track.id,
          title: track.title,
          artist: track.artist,
          album: track.albumTitle || selectedAlbum?.title,
          trackNumber: idx,
        });
        success++;
      } catch { /* skip failed */ }
    }
    toast.success(`Queued ${success}/${selectedTracks.size} tracks`);
    setSelectedTracks(new Set());
    setBatchDownloading(false);
  };

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.musicUpload(file);
      toast.success(`Uploaded ${result.tracks} track${result.tracks !== 1 ? "s" : ""} to ${result.artist}/${result.album}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSearch = async (e?: React.FormEvent, typeOverride?: SearchType) => {
    e?.preventDefault();
    if (!search.trim()) return;
    const type = typeOverride || searchType;
    setLoading(true);
    setView("search");
    try {
      const result = await api.musicSearch(search, type);
      setTracks(result.tracks || []);
      setAlbums(result.albums || []);
      setArtists(result.artists || []);
      setSelectedTracks(new Set());
    } catch {
      toast.error("Search failed");
    }
    setLoading(false);
  };

  const openAlbum = async (albumId: string) => {
    setDetailLoading(true);
    setView("album");
    try {
      const album = await api.musicAlbum(albumId);
      setSelectedAlbum(album);
    } catch {
      toast.error("Failed to load album");
      setView("search");
    }
    setDetailLoading(false);
  };

  const openArtist = async (artistId: string) => {
    setDetailLoading(true);
    setView("artist");
    try {
      const disco = await api.musicArtist(artistId);
      setSelectedArtist(disco);
    } catch {
      toast.error("Failed to load artist");
      setView("search");
    }
    setDetailLoading(false);
  };

  const downloadTrack = async (track: MusicTrack, trackNumber?: number) => {
    const id = track.id;
    setDownloadingTracks((s) => new Set(s).add(id));
    try {
      await api.musicDownloadTrack({
        trackId: id,
        title: track.title,
        artist: track.artist,
        album: track.albumTitle,
        trackNumber: trackNumber || 1,
      });
      toast.success("Track queued for download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
    setDownloadingTracks((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const downloadAlbum = async (albumId: string) => {
    setDownloadingAlbums((s) => new Set(s).add(albumId));
    try {
      const result = await api.musicDownloadAlbum(albumId);
      toast.success(`Queued ${result.tracks}/${result.totalTracks} tracks from "${result.album}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Album download failed");
    }
    setDownloadingAlbums((s) => {
      const next = new Set(s);
      next.delete(albumId);
      return next;
    });
  };

  // Schedule state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{ type: "track"; track: MusicTrack; trackNumber?: number } | { type: "album"; album: MusicAlbum } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const openSchedule = (target: typeof scheduleTarget) => {
    setScheduleTarget(target);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    setScheduleDate(now.toISOString().slice(0, 10));
    setScheduleTime(now.toTimeString().slice(0, 5));
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleTarget || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    setScheduling(true);
    try {
      if (scheduleTarget.type === "track") {
        const t = scheduleTarget.track;
        await api.musicScheduleTrack({
          trackId: t.id,
          title: t.title,
          artist: t.artist,
          album: t.albumTitle,
          trackNumber: scheduleTarget.trackNumber || 1,
          scheduledAt,
        });
        toast.success("Track scheduled");
      } else {
        const a = scheduleTarget.album;
        await api.musicScheduleAlbum({
          albumId: a.id,
          title: a.title,
          artist: a.artist,
          scheduledAt,
        });
        toast.success("Album scheduled");
      }
      setScheduleOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Schedule failed");
    }
    setScheduling(false);
  };

  const goBack = () => {
    setView("search");
    setSelectedAlbum(null);
    setSelectedArtist(null);
  };

  const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          {view !== "search" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold truncate">
              {view === "album" && selectedAlbum ? selectedAlbum.title : view === "artist" && selectedArtist ? selectedArtist.artist.name : "Music"}
            </h1>
            {view === "album" && selectedAlbum && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedAlbum.artist}</p>
            )}
            {view === "artist" && selectedArtist && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedArtist.artist.albumsCount} albums</p>
            )}
          </div>
        </div>

        {/* Search view */}
        {view === "search" && (
          <>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search songs, albums, artists..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-10"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setTracks([]); setAlbums([]); setArtists([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Upload from Lucida */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.flac,.mp3,.m4a,.wav"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {uploading ? "Uploading..." : "Upload Music (ZIP/FLAC)"}
            </Button>

            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["track", "album", "artist"] as SearchType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setSearchType(t); if (search) handleSearch(undefined, t); }}
                  className={`px-3 py-1.5 capitalize transition-colors flex-1 ${
                    searchType === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {t === "track" ? "Tracks" : t === "album" ? "Albums" : "Artists"}
                </button>
              ))}
            </div>

            {loading && (
              <div className="space-y-2">
                {searchType === "album" ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />)}
                  </div>
                ) : (
                  [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[64px] w-full rounded-xl" />)
                )}
              </div>
            )}

            {/* Track results */}
            {!loading && tracks.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground font-medium">Tracks</p>
                  <button onClick={selectAllTracks} className="text-[10px] text-primary hover:underline">
                    {selectedTracks.size === tracks.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    downloading={downloadingTracks.has(track.id)}
                    selected={selectedTracks.has(track.id)}
                    onToggle={() => toggleTrackSelection(track.id)}
                    onDownload={() => downloadTrack(track)}
                    onSchedule={() => openSchedule({ type: "track", track })}
                    onAlbumClick={() => track.albumId && openAlbum(track.albumId)}
                  />
                ))}
              </div>
            )}

            {/* Album results — grid */}
            {!loading && albums.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">Albums</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {albums.map((album) => (
                    <AlbumCard key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Artist results */}
            {!loading && artists.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium px-1">Artists</p>
                {artists.map((artist) => (
                  <ArtistRow key={String(artist.id)} artist={artist} onClick={() => openArtist(String(artist.id))} />
                ))}
              </div>
            )}

            {!loading && !hasResults && search && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Music2 className="h-8 w-8" />
                <p className="text-sm">No results found</p>
              </div>
            )}

            {!loading && !hasResults && !search && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Music2 className="h-8 w-8" />
                <p className="text-sm">Search for music to download FLAC</p>
              </div>
            )}
          </>
        )}

        {/* Album detail view */}
        {view === "album" && (
          <>
            {detailLoading && (
              <div className="space-y-3">
                <div className="flex gap-4">
                  <Skeleton className="h-28 w-28 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                </div>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[52px] w-full rounded-xl" />)}
              </div>
            )}
            {!detailLoading && selectedAlbum && (
              <>
                {/* Album header */}
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-start gap-4">
                    {selectedAlbum.cover ? (
                      <img src={selectedAlbum.cover} alt={selectedAlbum.title} className="h-28 w-28 rounded-xl object-cover shrink-0 shadow-lg" />
                    ) : (
                      <div className="h-28 w-28 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Disc3 className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-base font-semibold leading-snug">{selectedAlbum.title}</p>
                      <p className="text-sm text-muted-foreground">{selectedAlbum.artist}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(selectedAlbum.year || selectedAlbum.releaseDate) && (
                          <Badge variant="secondary" className="text-[10px]">{selectedAlbum.year || selectedAlbum.releaseDate?.slice(0, 4)}</Badge>
                        )}
                        {selectedAlbum.genre && (
                          <Badge variant="secondary" className="text-[10px]">{selectedAlbum.genre}</Badge>
                        )}
                        {selectedAlbum.tracks?.[0]?.audioQuality && (
                          <QualityBadge quality={selectedAlbum.tracks[0].audioQuality} />
                        )}
                      </div>
                      {selectedAlbum.totalTracks && (
                        <p className="text-[11px] text-muted-foreground">{selectedAlbum.totalTracks} tracks</p>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    size="sm"
                    onClick={() => downloadAlbum(selectedAlbum.id)}
                    disabled={downloadingAlbums.has(selectedAlbum.id)}
                  >
                    {downloadingAlbums.has(selectedAlbum.id) ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Downloading...</>
                    ) : (
                      <><Download className="h-3.5 w-3.5 mr-1.5" /> Download Album (FLAC)</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => openSchedule({ type: "album", album: selectedAlbum })}
                  >
                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Schedule for Later
                  </Button>
                </div>

                {/* Track list */}
                {selectedAlbum.tracks && selectedAlbum.tracks.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
                    {selectedAlbum.tracks.map((track, i) => (
                      <div key={track.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-accent/30 transition-colors">
                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug truncate">{track.title}</p>
                          {track.artist !== selectedAlbum.artist && (
                            <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                          )}
                        </div>
                        {track.audioQuality && <QualityBadge quality={track.audioQuality} />}
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {track.duration > 0 && formatDuration(track.duration)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => downloadTrack({ ...track, albumTitle: track.albumTitle || selectedAlbum.title }, i + 1)}
                          disabled={downloadingTracks.has(track.id)}
                        >
                          {downloadingTracks.has(track.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Artist detail view — album grid */}
        {view === "artist" && (
          <>
            {detailLoading && (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square w-full rounded-xl" />)}
              </div>
            )}
            {!detailLoading && selectedArtist && (
              <div className="grid grid-cols-2 gap-3">
                {selectedArtist.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Batch action bar */}
      {selectedTracks.size > 0 && (
        <div className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-medium">{selectedTracks.size} selected</span>
          <Button size="sm" onClick={batchDownload} disabled={batchDownloading}>
            {batchDownloading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Download
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedTracks(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Schedule {scheduleTarget?.type === "album" ? "Album" : "Track"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">
            {scheduleTarget?.type === "track"
              ? `${scheduleTarget.track.artist} - ${scheduleTarget.track.title}`
              : scheduleTarget?.type === "album"
                ? `${scheduleTarget.album.artist} - ${scheduleTarget.album.title}`
                : ""}
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="flex-1" />
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-28" />
            </div>
            <Button className="w-full" onClick={submitSchedule} disabled={scheduling}>
              {scheduling ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5 mr-1.5" />}
              Schedule Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

/* ---------- Components ---------- */

function QualityBadge({ quality }: { quality: { maximumBitDepth: number; maximumSamplingRate: number; isHiRes: boolean } }) {
  return (
    <Badge
      variant="secondary"
      className={`text-[9px] font-normal gap-0.5 ${quality.isHiRes ? "text-amber-400 border-amber-400/30" : "text-green-400 border-green-400/30"}`}
    >
      {quality.isHiRes && <Sparkles className="h-2.5 w-2.5" />}
      {quality.maximumBitDepth}bit/{quality.maximumSamplingRate}kHz
    </Badge>
  );
}

function TrackRow({
  track,
  downloading,
  selected,
  onToggle,
  onDownload,
  onSchedule,
  onAlbumClick,
}: {
  track: MusicTrack;
  downloading: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onDownload: () => void;
  onSchedule?: () => void;
  onAlbumClick?: () => void;
}) {
  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${selected ? "border-primary/50" : "border-border/60"}`}>
      <div className="flex items-center gap-3 p-3">
        {onToggle && (
          <button onClick={onToggle} className="shrink-0">
            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
              {selected && <span className="text-[10px] text-primary-foreground font-bold">&#10003;</span>}
            </div>
          </button>
        )}
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.albumTitle} className="h-11 w-11 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">{track.title}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{track.artist}</span>
            {track.albumTitle && (
              <>
                <span className="shrink-0">-</span>
                <button className="truncate hover:text-foreground transition-colors" onClick={onAlbumClick}>
                  {track.albumTitle}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {track.audioQuality && <QualityBadge quality={track.audioQuality} />}
          {track.duration > 0 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 tabular-nums">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(track.duration)}
            </span>
          )}
          {onSchedule && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onSchedule}>
              <CalendarClock className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AlbumCard({ album, onClick }: { album: MusicAlbum; onClick: () => void }) {
  const year = album.releaseDate?.slice(0, 4) || album.year;
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border/60 bg-card overflow-hidden text-left hover:border-border transition-colors group"
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        {album.cover ? (
          <img
            src={album.cover}
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 space-y-0.5">
        <p className="text-xs font-medium leading-snug truncate">{album.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{album.artist}</p>
        <div className="flex items-center gap-1 flex-wrap">
          {year && <span className="text-[10px] text-muted-foreground">{year}</span>}
          {album.totalTracks && (
            <span className="text-[10px] text-muted-foreground">{album.totalTracks} tracks</span>
          )}
          {album.genre && (
            <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">{album.genre}</Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function ArtistRow({ artist, onClick }: { artist: MusicArtist; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border/60 bg-card overflow-hidden text-left hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3 p-3">
        {artist.picture ? (
          <img src={artist.picture} alt={artist.name} className="h-11 w-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">{artist.name}</p>
          <p className="text-[11px] text-muted-foreground">{artist.albumsCount} albums</p>
        </div>
      </div>
    </button>
  );
}
