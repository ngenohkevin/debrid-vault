const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// For large uploads, bypass Cloudflare (100MB limit) and the Next.js proxy
// by sending directly to the Pi backend via Tailscale HTTPS.
// Falls back to the proxy for non-Tailscale networks.
function getUploadBase(): string {
  if (typeof window === "undefined") return API_BASE;
  const env = process.env.NEXT_PUBLIC_UPLOAD_URL;
  if (env) return env;
  // Auto-detect: if on tailnet, use direct Pi URL
  return "https://pi.taila26a58.ts.net:6501";
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await res.json();
      throw new Error(body?.error || `API error: ${res.status}`);
    }
    // Non-JSON error (e.g. Cloudflare 502 HTML page) — don't leak raw HTML
    throw new Error(`Backend unavailable (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Backend unavailable (${res.status})`);
  }
  return res.json();
}

function withProvider(base: string, provider?: string, extraParams?: string): string {
  const parts: string[] = [];
  if (extraParams) parts.push(extraParams);
  if (provider) parts.push(`provider=${provider}`);
  return parts.length > 0 ? `${base}?${parts.join("&")}` : base;
}

export const api = {
  getProviders: () => fetchAPI<import("./types").Provider[]>("/api/providers"),

  getStatus: () => fetchAPI<import("./types").SystemStatus>("/api/status"),
  getStorage: () => fetchAPI<import("./types").StorageInfo>("/api/storage"),

  getDownloads: () => fetchAPI<import("./types").DownloadItem[]>("/api/downloads"),
  getCompletedSources: () => fetchAPI<string[]>("/api/downloads/completed-sources"),
  getDownload: (id: string) => fetchAPI<import("./types").DownloadItem>(`/api/downloads/${id}`),
  startDownload: (source: string, category: import("./types").Category, folder?: string, provider?: string) =>
    fetchAPI<import("./types").DownloadItem>("/api/downloads", {
      method: "POST",
      body: JSON.stringify({ source, category, ...(folder ? { folder } : {}), ...(provider ? { provider } : {}) }),
    }),
  startBatchDownload: (links: string[], groupName: string, category: import("./types").Category, provider?: string) =>
    fetchAPI<import("./types").DownloadItem[]>("/api/downloads/batch", {
      method: "POST",
      body: JSON.stringify({ links, groupName, category, ...(provider ? { provider } : {}) }),
    }),
  cancelDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}`, { method: "DELETE" }),
  removeDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/remove`, { method: "DELETE" }),
  pauseDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/pause`, { method: "POST" }),
  resumeDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/resume`, { method: "POST" }),
  retryMove: (id: string) => fetchAPI<void>(`/api/downloads/${id}/retry-move`, { method: "POST" }),

  getRDUser: (provider?: string) =>
    fetchAPI<import("./types").RDUser>(withProvider("/api/rd/user", provider)),
  getRDDownloads: (limit?: number, provider?: string) =>
    fetchAPI<import("./types").RDDownload[]>(withProvider("/api/rd/downloads", provider, limit ? `limit=${limit}` : "")),
  getRDTorrents: (provider?: string) =>
    fetchAPI<import("./types").RDTorrent[]>(withProvider("/api/rd/torrents", provider)),
  invalidateRDCache: (provider?: string) =>
    fetchAPI<void>(withProvider("/api/rd/cache/invalidate", provider), { method: "POST" }),
  getRDTorrentInfo: (id: string, provider?: string) =>
    fetchAPI<import("./types").RDTorrentInfo>(withProvider(`/api/rd/torrents/${id}`, provider)),
  unrestrictLink: (link: string, provider?: string) =>
    fetchAPI<{ download: string }>(withProvider("/api/rd/unrestrict", provider), {
      method: "POST",
      body: JSON.stringify({ link }),
    }),

  getLibrary: (category?: string) =>
    fetchAPI<import("./types").MediaFile[]>(`/api/library${category ? `?category=${category}` : ""}`),
  searchLibrary: (query: string) =>
    fetchAPI<import("./types").MediaFile[]>(`/api/library/search?q=${encodeURIComponent(query)}`),
  moveMedia: (path: string, category: import("./types").Category) =>
    fetchAPI<{ status: string; newPath: string }>("/api/library/move", {
      method: "POST",
      body: JSON.stringify({ path, category }),
    }),
  deleteMedia: (path: string) =>
    fetchAPI<void>(`/api/library/${encodeURIComponent(path)}`, { method: "DELETE" }),

  getSchedules: () => fetchAPI<import("./types").ScheduledDownload[]>("/api/schedules"),
  createSchedule: (source: string, category: import("./types").Category, scheduledAt: string, speedLimitMbps: number, folder?: string, name?: string, provider?: string) =>
    fetchAPI<import("./types").ScheduledDownload>("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ source, category, scheduledAt, speedLimitMbps, ...(folder ? { folder } : {}), ...(name ? { name } : {}), ...(provider ? { provider } : {}) }),
    }),
  updateSchedule: (id: string, updates: { scheduledAt?: string; speedLimitMbps?: number }) =>
    fetchAPI<import("./types").ScheduledDownload>(`/api/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),
  cancelSchedule: (id: string) => fetchAPI<void>(`/api/schedules/${id}`, { method: "DELETE" }),
  removeSchedule: (id: string) => fetchAPI<void>(`/api/schedules/${id}/remove`, { method: "DELETE" }),
  checkResumable: (id: string) => fetchAPI<{ resumable: boolean; reason?: string }>(`/api/downloads/${id}/resumable`),
  scheduleExisting: (id: string, scheduledAt: string, speedLimitMbps: number) =>
    fetchAPI<import("./types").ScheduledDownload>(`/api/downloads/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt, speedLimitMbps }),
    }),
  scheduleExistingGroup: (groupId: string, scheduledAt: string, speedLimitMbps: number) =>
    fetchAPI<import("./types").ScheduledDownload>(`/api/downloads/group/${groupId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt, speedLimitMbps }),
    }),

  // Music (DAB)
  musicSearch: (query: string, type?: string) =>
    fetchAPI<import("./types").MusicSearchResult>(`/api/music/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ""}`),
  musicAlbum: (id: string) =>
    fetchAPI<import("./types").MusicAlbum>(`/api/music/album?id=${encodeURIComponent(id)}`),
  musicArtist: (id: string) =>
    fetchAPI<import("./types").MusicDiscography>(`/api/music/artist?id=${encodeURIComponent(id)}`),
  musicDownloadTrack: (params: { trackId: string; title: string; artist: string; album?: string; trackNumber?: number; quality?: string; folder?: string }) =>
    fetchAPI<import("./types").DownloadItem>("/api/music/download/track", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  musicDownloadAlbum: (albumId: string, quality?: string) =>
    fetchAPI<import("./types").MusicAlbumDownloadResult>("/api/music/download/album", {
      method: "POST",
      body: JSON.stringify({ albumId, ...(quality ? { quality } : {}) }),
    }),
  musicLyrics: (title: string, artist: string) =>
    fetchAPI<import("./types").MusicLyrics>(`/api/music/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`),
  musicUpload: (file: File, onProgress?: (percent: number) => void): { promise: Promise<{ artist: string; album: string; tracks: number; path: string; files: string[] }>; abort: () => void } => {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<{ artist: string; album: string; tracks: number; path: string; files: string[] }>((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }

      xhr.addEventListener("load", () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 400) reject(new Error(data.error || `Upload failed (${xhr.status})`));
          else resolve(data);
        } catch { reject(new Error(`Upload failed (${xhr.status})`)); }
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed — network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

      xhr.open("POST", `${getUploadBase()}/api/music/upload`);
      xhr.send(form);
    });
    return { promise, abort: () => xhr.abort() };
  },
  musicScheduleTrack: (params: { trackId: string; title: string; artist: string; album?: string; trackNumber?: number; scheduledAt: string; speedLimitMbps?: number }) =>
    fetchAPI<import("./types").ScheduledDownload>("/api/music/schedule/track", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  musicScheduleAlbum: (params: { albumId: string; title?: string; artist?: string; scheduledAt: string; speedLimitMbps?: number }) =>
    fetchAPI<import("./types").ScheduledDownload>("/api/music/schedule/album", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getSettings: () => fetchAPI<import("./types").EngineSettings>("/api/settings"),
  updateSettings: (settings: Partial<import("./types").EngineSettings>) =>
    fetchAPI<import("./types").EngineSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  getEventsURL: () => `${API_BASE}/api/downloads/events`,

  pauseProvider: (name: string) =>
    fetchAPI<{ status: string; provider: string }>(`/api/providers/${name}/pause`, { method: "POST" }),
  resumeProvider: (name: string) =>
    fetchAPI<{ status: string; provider: string }>(`/api/providers/${name}/resume`, { method: "POST" }),
};
