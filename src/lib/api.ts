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
  startDownload: (source: string, category: import("./types").Category) =>
    fetchAPI<import("./types").DownloadItem>("/api/downloads", {
      method: "POST",
      body: JSON.stringify({ source, category }),
    }),
  cancelDownload: (id: string) => fetchAPI<void>(`/api/downloads/${id}`, { method: "DELETE" }),

  getRDUser: () => fetchAPI<import("./types").RDUser>("/api/rd/user"),
  getRDDownloads: (limit?: number) =>
    fetchAPI<import("./types").RDDownload[]>(`/api/rd/downloads${limit ? `?limit=${limit}` : ""}`),

  getLibrary: (category?: string) =>
    fetchAPI<import("./types").MediaFile[]>(`/api/library${category ? `?category=${category}` : ""}`),
  searchLibrary: (query: string) =>
    fetchAPI<import("./types").MediaFile[]>(`/api/library/search?q=${encodeURIComponent(query)}`),
  deleteMedia: (path: string) =>
    fetchAPI<void>(`/api/library/${encodeURIComponent(path)}`, { method: "DELETE" }),

  getEventsURL: () => `${API_BASE}/api/downloads/events`,
};
