"use client";

import { useState, useRef } from "react";
import { Search, X, Music2, Disc3, Download, User, Loader2, CalendarClock, Upload, ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AudioQualityBadge } from "@/components/quality-tags";
import type { MusicTrack, MusicAlbum, MusicArtist, MusicDiscography } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await api.musicUpload(file, (percent) => setUploadProgress(percent));
      toast.success(`Uploaded ${result.tracks} track${result.tracks !== 1 ? "s" : ""} to ${result.artist}/${result.album}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Schedule
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<{ type: "track"; track: MusicTrack; trackNumber?: number } | { type: "album"; album: MusicAlbum } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const openSchedule = (target: typeof scheduleTarget) => {
    setScheduleTarget(target);
    const now = new Date(); now.setHours(now.getHours() + 1, 0, 0, 0);
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
        await api.musicScheduleTrack({ trackId: t.id, title: t.title, artist: t.artist, album: t.albumTitle, trackNumber: scheduleTarget.trackNumber || 1, scheduledAt });
        toast.success("Track scheduled");
      } else {
        const a = scheduleTarget.album;
        await api.musicScheduleAlbum({ albumId: a.id, title: a.title, artist: a.artist, scheduledAt });
        toast.success("Album scheduled");
      }
      setScheduleOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Schedule failed"); }
    setScheduling(false);
  };

  const handleSearch = async (e?: React.FormEvent, typeOverride?: SearchType) => {
    e?.preventDefault();
    if (!search.trim()) return;
    const type = typeOverride || searchType;
    setLoading(true); setView("search");
    try {
      const result = await api.musicSearch(search, type);
      setTracks(result.tracks || []); setAlbums(result.albums || []); setArtists(result.artists || []);
    } catch { toast.error("Search failed"); }
    setLoading(false);
  };

  const openAlbum = async (albumId: string) => {
    setDetailLoading(true); setView("album");
    try { setSelectedAlbum(await api.musicAlbum(albumId)); }
    catch { toast.error("Failed to load album"); setView("search"); }
    setDetailLoading(false);
  };

  const openArtist = async (artistId: string) => {
    setDetailLoading(true); setView("artist");
    try { setSelectedArtist(await api.musicArtist(artistId)); }
    catch { toast.error("Failed to load artist"); setView("search"); }
    setDetailLoading(false);
  };

  const downloadTrack = async (track: MusicTrack, trackNumber?: number) => {
    setDownloadingTracks((s) => new Set(s).add(track.id));
    try {
      await api.musicDownloadTrack({ trackId: track.id, title: track.title, artist: track.artist, album: track.albumTitle, trackNumber: trackNumber || 1 });
      toast.success("Track queued");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Download failed"); }
    setDownloadingTracks((s) => { const n = new Set(s); n.delete(track.id); return n; });
  };

  const downloadAlbum = async (albumId: string) => {
    setDownloadingAlbums((s) => new Set(s).add(albumId));
    try {
      const result = await api.musicDownloadAlbum(albumId);
      toast.success(`Queued ${result.tracks}/${result.totalTracks} tracks`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Album download failed"); }
    setDownloadingAlbums((s) => { const n = new Set(s); n.delete(albumId); return n; });
  };

  const goBack = () => { setView("search"); setSelectedAlbum(null); setSelectedArtist(null); };
  const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0;

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        {view === "search" ? (
          <PageHeader title="Music">
            <input ref={fileInputRef} type="file" accept=".zip,.flac,.mp3,.m4a,.wav" className="hidden" onChange={handleUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-card text-[12px] text-fg-secondary hover:bg-surface-secondary transition-colors overflow-hidden"
            >
              {uploading && (
                <div className="absolute inset-0 bg-accent-green/15">
                  <div className="h-full bg-accent-green/20 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              <span className="relative flex items-center gap-1.5">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? `${uploadProgress}%` : "Upload"}
              </span>
            </button>
          </PageHeader>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="flex items-center justify-center h-9 w-9 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-secondary transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold text-fg-primary truncate">
                {view === "album" && selectedAlbum ? selectedAlbum.title : selectedArtist?.artist.name || ""}
              </h1>
              {view === "album" && selectedAlbum && (
                <p className="text-[13px] text-fg-secondary">{selectedAlbum.artist}</p>
              )}
            </div>
          </div>
        )}

        {/* Search view */}
        {view === "search" && (
          <>
            {/* Search bar */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
                <input
                  placeholder="Search songs, albums, artists..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-secondary border border-border-card text-[13px] text-fg-primary placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent-blue"
                />
                {search && (
                  <button type="button" onClick={() => { setSearch(""); setTracks([]); setAlbums([]); setArtists([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-secondary">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Tabs */}
            <div className="flex border-b border-border-card">
              {(["track", "album", "artist"] as SearchType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setSearchType(t); if (search) handleSearch(undefined, t); }}
                  className={cn(
                    "flex-1 pb-2.5 text-[13px] font-medium transition-colors border-b-2",
                    searchType === t
                      ? "text-accent-blue border-accent-blue"
                      : "text-fg-muted border-transparent hover:text-fg-secondary"
                  )}
                >
                  {t === "track" ? "Tracks" : t === "album" ? "Albums" : "Artists"}
                </button>
              ))}
            </div>

            {loading && (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl bg-surface-secondary" />)}
              </div>
            )}

            {/* Track results */}
            {!loading && tracks.length > 0 && (
              <div className="space-y-2.5">
                {tracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    downloading={downloadingTracks.has(track.id)}
                    onDownload={() => downloadTrack(track)}
                    onAlbumClick={() => track.albumId && openAlbum(track.albumId)}
                  />
                ))}
              </div>
            )}

            {/* Album results */}
            {!loading && albums.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                ))}
              </div>
            )}

            {/* Artist results */}
            {!loading && artists.length > 0 && (
              <div className="space-y-2.5">
                {artists.map((artist) => (
                  <ArtistRow key={String(artist.id)} artist={artist} onClick={() => openArtist(String(artist.id))} />
                ))}
              </div>
            )}

            {!loading && !hasResults && search && (
              <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
                <Music2 className="h-10 w-10" />
                <p className="text-sm">No results found</p>
              </div>
            )}
            {!loading && !hasResults && !search && (
              <div className="flex flex-col items-center gap-2 py-16 text-fg-muted">
                <Music2 className="h-10 w-10" />
                <p className="text-sm font-medium">Search for music</p>
                <p className="text-xs">Download FLAC tracks and albums</p>
              </div>
            )}
          </>
        )}

        {/* Album detail */}
        {view === "album" && (
          <>
            {detailLoading && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-secondary p-4 flex gap-4">
                  <Skeleton className="h-32 w-32 rounded-xl bg-surface-tertiary shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4 bg-surface-tertiary" /><Skeleton className="h-4 w-1/2 bg-surface-tertiary" /></div>
                </div>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full bg-surface-secondary" />)}
              </div>
            )}
            {!detailLoading && selectedAlbum && (
              <>
                {/* Album header card */}
                <div className="rounded-2xl border border-border-card bg-surface-secondary p-4">
                  <div className="flex items-start gap-4">
                    {selectedAlbum.cover ? (
                      <img src={selectedAlbum.cover} alt={selectedAlbum.title} className="h-32 w-32 rounded-xl object-cover shrink-0 shadow-lg" />
                    ) : (
                      <div className="h-32 w-32 rounded-xl bg-surface-tertiary flex items-center justify-center shrink-0">
                        <Disc3 className="h-10 w-10 text-fg-muted" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-[15px] font-bold text-fg-primary leading-snug">{selectedAlbum.title}</p>
                      <p className="text-[13px] text-fg-secondary">{selectedAlbum.artist}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(selectedAlbum.year || selectedAlbum.releaseDate) && (
                          <span className="text-[9px] font-medium text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">
                            {selectedAlbum.year || selectedAlbum.releaseDate?.slice(0, 4)}
                          </span>
                        )}
                        {selectedAlbum.genre && (
                          <span className="text-[9px] font-medium text-fg-muted bg-surface-tertiary px-1.5 py-0.5 rounded-full">
                            {selectedAlbum.genre}
                          </span>
                        )}
                        {selectedAlbum.tracks?.[0]?.audioQuality && (
                          <AudioQualityBadge
                            bitDepth={selectedAlbum.tracks[0].audioQuality.maximumBitDepth}
                            sampleRate={selectedAlbum.tracks[0].audioQuality.maximumSamplingRate}
                          />
                        )}
                      </div>
                      {selectedAlbum.totalTracks && (
                        <p className="text-[11px] text-fg-muted">{selectedAlbum.totalTracks} tracks</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => downloadAlbum(selectedAlbum.id)}
                      disabled={downloadingAlbums.has(selectedAlbum.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-blue text-white text-[13px] font-semibold hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                    >
                      {downloadingAlbums.has(selectedAlbum.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download Album
                    </button>
                    <button
                      onClick={() => openSchedule({ type: "album", album: selectedAlbum })}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border-card text-[13px] text-fg-secondary hover:bg-surface-tertiary transition-colors"
                    >
                      <CalendarClock className="h-4 w-4" /> Schedule
                    </button>
                  </div>
                </div>

                {/* Track list */}
                {selectedAlbum.tracks && selectedAlbum.tracks.length > 0 && (
                  <div className="divide-y divide-border-subtle">
                    {selectedAlbum.tracks.map((track, i) => (
                      <div key={track.id} className="flex items-center gap-3 py-3 hover:bg-surface-secondary/50 transition-colors rounded-lg px-1">
                        <span className="text-[12px] text-fg-muted w-5 text-right shrink-0 font-mono">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-fg-primary truncate">{track.title}</p>
                        </div>
                        <span className="text-[11px] font-mono text-fg-muted shrink-0">
                          {track.duration > 0 && formatDuration(track.duration)}
                        </span>
                        <button
                          onClick={() => downloadTrack({ ...track, albumTitle: track.albumTitle || selectedAlbum.title }, i + 1)}
                          disabled={downloadingTracks.has(track.id)}
                          className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-tertiary transition-colors shrink-0"
                        >
                          {downloadingTracks.has(track.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Artist detail — album grid */}
        {view === "artist" && (
          <>
            {detailLoading && (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square w-full rounded-2xl bg-surface-secondary" />)}
              </div>
            )}
            {!detailLoading && selectedArtist && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedArtist.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm bg-surface-secondary border-border-card">
          <DialogHeader>
            <DialogTitle className="text-base text-fg-primary">
              Schedule {scheduleTarget?.type === "album" ? "Album" : "Track"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-fg-secondary truncate">
            {scheduleTarget?.type === "track" ? `${scheduleTarget.track.artist} - ${scheduleTarget.track.title}` : scheduleTarget?.type === "album" ? `${scheduleTarget.album.artist} - ${scheduleTarget.album.title}` : ""}
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="flex-1 bg-surface-tertiary border-border-card" />
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-28 bg-surface-tertiary border-border-card" />
            </div>
            <Button className="w-full bg-accent-blue hover:bg-accent-blue/90" onClick={submitSchedule} disabled={scheduling}>
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

function TrackCard({ track, downloading, onDownload, onAlbumClick }: {
  track: MusicTrack; downloading: boolean; onDownload: () => void; onAlbumClick?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border-card bg-surface-secondary overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {track.albumCover ? (
          <img src={track.albumCover} alt={track.albumTitle} className="h-12 w-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-surface-tertiary flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 text-fg-muted" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-fg-primary truncate">{track.title}</p>
          <p className="text-[11px] text-fg-secondary truncate">
            {track.artist}
            {track.albumTitle && (
              <> &middot; <button className="hover:text-fg-primary transition-colors" onClick={onAlbumClick}>{track.albumTitle}</button></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {track.audioQuality && (
            <AudioQualityBadge bitDepth={track.audioQuality.maximumBitDepth} sampleRate={track.audioQuality.maximumSamplingRate} />
          )}
          <span className="text-[11px] font-mono text-fg-muted">{track.duration > 0 && formatDuration(track.duration)}</span>
          <button onClick={onDownload} disabled={downloading} className="p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-surface-tertiary transition-colors">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlbumCard({ album, onClick }: { album: MusicAlbum; onClick: () => void }) {
  const year = album.releaseDate?.slice(0, 4) || album.year;
  return (
    <button onClick={onClick} className="rounded-2xl border border-border-card bg-surface-secondary overflow-hidden text-left hover:border-fg-muted/30 transition-colors group">
      <div className="aspect-square relative overflow-hidden bg-surface-tertiary">
        {album.cover ? (
          <img src={album.cover} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Disc3 className="h-8 w-8 text-fg-muted/40" /></div>
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-[12px] font-semibold text-fg-primary leading-snug truncate">{album.title}</p>
        <p className="text-[10px] text-fg-secondary truncate">{album.artist}</p>
        {year && <p className="text-[10px] text-fg-muted">{year}</p>}
      </div>
    </button>
  );
}

function ArtistRow({ artist, onClick }: { artist: MusicArtist; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl border border-border-card bg-surface-secondary overflow-hidden text-left hover:bg-surface-tertiary/50 transition-colors">
      <div className="flex items-center gap-3 p-3">
        {artist.picture ? (
          <img src={artist.picture} alt={artist.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-surface-tertiary flex items-center justify-center shrink-0"><User className="h-4 w-4 text-fg-muted" /></div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-fg-primary truncate">{artist.name}</p>
          <p className="text-[11px] text-fg-secondary">{artist.albumsCount} albums</p>
        </div>
      </div>
    </button>
  );
}
