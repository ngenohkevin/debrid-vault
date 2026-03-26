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

  // Album/Artist detail view
  const [view, setView] = useState<View>("search");
  const [selectedAlbum, setSelectedAlbum] = useState<MusicAlbum | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<MusicDiscography | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Download state
  const [downloadingTracks, setDownloadingTracks] = useState<Set<string>>(new Set());
  const [downloadingAlbums, setDownloadingAlbums] = useState<Set<string>>(new Set());

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setView("search");
    try {
      const result = await api.musicSearch(search, searchType);
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

  const downloadTrack = async (trackId: string) => {
    setDownloadingTracks((s) => new Set(s).add(trackId));
    try {
      await api.musicDownloadTrack(trackId);
      toast.success("Track queued for download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
    setDownloadingTracks((s) => {
      const next = new Set(s);
      next.delete(trackId);
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
          <div>
            <h1 className="text-lg font-semibold">
              {view === "album" && selectedAlbum ? selectedAlbum.title : view === "artist" && selectedArtist ? selectedArtist.artist.name : "Music"}
            </h1>
            {view === "album" && selectedAlbum && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedAlbum.artist}</p>
            )}
          </div>
        </div>

        {/* Search (always visible) */}
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

            {/* Search type filter */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(["track", "album", "artist"] as SearchType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setSearchType(t); if (search) handleSearch(); }}
                  className={`px-3 py-1.5 capitalize transition-colors flex-1 ${
                    searchType === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {t === "track" ? "Tracks" : t === "album" ? "Albums" : "Artists"}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[64px] w-full rounded-xl" />)}
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
                    onDownload={() => downloadTrack(track.id)}
                    onAlbumClick={() => track.albumId && openAlbum(track.albumId)}
                  />
                ))}
              </div>
            )}

            {/* Album results */}
            {!loading && albums.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium px-1">Albums</p>
                {albums.map((album) => (
                  <AlbumRow key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                ))}
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

            {/* Empty */}
            {!loading && !hasResults && search && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Music2 className="h-8 w-8" />
                <p className="text-sm">No results found</p>
              </div>
            )}

            {/* Initial state */}
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
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[56px] w-full rounded-xl" />)}
              </div>
            )}
            {!detailLoading && selectedAlbum && (
              <>
                {/* Album header */}
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex items-start gap-3">
                    {selectedAlbum.cover ? (
                      <img src={selectedAlbum.cover} alt={selectedAlbum.title} className="h-16 w-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Disc3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-snug">{selectedAlbum.title}</p>
                      <p className="text-xs text-muted-foreground">{selectedAlbum.artist}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedAlbum.year && <Badge variant="secondary" className="text-[10px]">{selectedAlbum.year}</Badge>}
                        {selectedAlbum.genre && <Badge variant="secondary" className="text-[10px]">{selectedAlbum.genre}</Badge>}
                        {selectedAlbum.totalTracks && (
                          <span className="text-[10px] text-muted-foreground">{selectedAlbum.totalTracks} tracks</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-3"
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
                  <div className="space-y-1.5">
                    {selectedAlbum.tracks.map((track, i) => (
                      <div key={track.id} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                        <div className="flex items-center gap-3 p-3">
                          <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug truncate">{track.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{track.artist}</p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {track.duration > 0 && formatDuration(track.duration)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => downloadTrack(track.id)}
                            disabled={downloadingTracks.has(track.id)}
                          >
                            {downloadingTracks.has(track.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Artist detail view */}
        {view === "artist" && (
          <>
            {detailLoading && (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
              </div>
            )}
            {!detailLoading && selectedArtist && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium px-1">
                  {selectedArtist.albums.length} album{selectedArtist.albums.length !== 1 ? "s" : ""}
                </p>
                {selectedArtist.albums.map((album) => (
                  <AlbumRow key={album.id} album={album} onClick={() => openAlbum(album.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
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
          <img src={track.albumCover} alt={track.albumTitle} className="h-10 w-10 rounded-md object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Music2 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">{track.title}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{track.artist}</span>
            {track.albumTitle && (
              <>
                <span>-</span>
                <button className="truncate hover:text-foreground transition-colors" onClick={onAlbumClick}>
                  {track.albumTitle}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {track.audioQuality?.isHiRes && (
            <span title="Hi-Res"><Sparkles className="h-3 w-3 text-amber-400" /></span>
          )}
          {track.duration > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(track.duration)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AlbumRow({ album, onClick }: { album: MusicAlbum; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border/60 bg-card overflow-hidden text-left hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3 p-3">
        {album.cover ? (
          <img src={album.cover} alt={album.title} className="h-10 w-10 rounded-md object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Disc3 className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">{album.title}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{album.artist}</span>
            {album.releaseDate && <span>{album.releaseDate.slice(0, 4)}</span>}
            {album.totalTracks && <span>{album.totalTracks} tracks</span>}
          </div>
        </div>
        <Disc3 className="h-4 w-4 text-muted-foreground shrink-0" />
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
          <img src={artist.picture} alt={artist.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug truncate">{artist.name}</p>
          <p className="text-[11px] text-muted-foreground">{artist.albumsCount} albums</p>
        </div>
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}
