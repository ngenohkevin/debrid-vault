const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => fetchAPI<import("./types").SystemStatus>("/api/status"),
  getStorage: () => fetchAPI<import("./types").StorageInfo>("/api/storage"),

  getDownloads: () => fetchAPI<import("./types").DownloadItem[]>("/api/downloads"),
  getDownload: (id: string) => fetchAPI<import("./types").DownloadItem>(`/api/downloads/${id}`),
  startDownload: (source: string, category: import("./types").Category, folder?: string) =>
    fetchAPI<import("./types").DownloadItem>("/api/downloads", {
      method: "POST",
      body: JSON.stringify({ source, category, ...(folder ? { folder } : {}) }),
    }),
  startBatchDownload: (links: string[], groupName: string, category: import("./types").Category) =>
    fetchAPI<import("./types").DownloadItem[]>("/api/downloads/batch", {
      method: "POST",
      body: JSON.stringify({ links, groupName, category }),
    }),
  cancelDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}`, { method: "DELETE" }),
  removeDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/remove`, { method: "DELETE" }),
  pauseDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/pause`, { method: "POST" }),
  resumeDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}/resume`, { method: "POST" }),

  getRDUser: () => fetchAPI<import("./types").RDUser>("/api/rd/user"),
  getRDDownloads: (limit?: number) =>
    fetchAPI<import("./types").RDDownload[]>(`/api/rd/downloads${limit ? `?limit=${limit}` : ""}`),
  getRDTorrents: () => fetchAPI<import("./types").RDTorrent[]>("/api/rd/torrents"),
  invalidateRDCache: () => fetchAPI<void>("/api/rd/cache/invalidate", { method: "POST" }),
  getRDTorrentInfo: (id: string) => fetchAPI<import("./types").RDTorrentInfo>(`/api/rd/torrents/${id}`),

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
  createSchedule: (source: string, category: import("./types").Category, scheduledAt: string, speedLimitMbps: number, folder?: string) =>
    fetchAPI<import("./types").ScheduledDownload>("/api/schedules", {
      method: "POST",
      body: JSON.stringify({ source, category, scheduledAt, speedLimitMbps, ...(folder ? { folder } : {}) }),
    }),
  cancelSchedule: (id: string) => fetchAPI<void>(`/api/schedules/${id}`, { method: "DELETE" }),
  removeSchedule: (id: string) => fetchAPI<void>(`/api/schedules/${id}/remove`, { method: "DELETE" }),

  getSettings: () => fetchAPI<import("./types").EngineSettings>("/api/settings"),
  updateSettings: (settings: Partial<import("./types").EngineSettings>) =>
    fetchAPI<import("./types").EngineSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  getEventsURL: () => `${API_BASE}/api/downloads/events`,
};
