"use client";

import { useState } from "react";
import { Search, X, Music2, Disc3, Download, User, Clock, Sparkles, ChevronLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square w-full rounded-xl" />)}
                  </div>
                ) : (
                  [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[64px] w-full rounded-xl" />)
                )}
              </div>
            )}

            {/* Track results */}
            {!loading && tracks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium px-1">Tracks</p>
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    downloading={downloadingTracks.has(track.id)}
                    onDownload={() => downloadTrack(track)}
                    onAlbumClick={() => track.albumId && openAlbum(track.albumId)}
                  />
                ))}
              </div>
            )}

            {/* Album results — grid */}
            {!loading && albums.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium px-1">Albums</p>
                <div className="grid grid-cols-2 gap-3">
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
                        {selectedAlbum.year && (
                          <Badge variant="secondary" className="text-[10px]">{selectedAlbum.year}</Badge>
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
  onDownload,
  onAlbumClick,
}: {
  track: MusicTrack;
  downloading: boolean;
  onDownload: () => void;
  onAlbumClick?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
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
      className="rounded-xl border border-border/60 bg-card overflow-hidden text-left hover:border-border transition-colors group"
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
            <Disc3 className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-0.5">
        <p className="text-sm font-medium leading-snug truncate">{album.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{album.artist}{year ? ` \u00b7 ${year}` : ""}</p>
        {album.totalTracks && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {album.totalTracks} tracks
          </span>
        )}
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
