import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Must import after mocking fetch
const { api } = await import("@/lib/api");

describe("api client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("getDownloads fetches from /api/downloads", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const result = await api.getDownloads();
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/downloads",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("startDownload sends POST with source and category", async () => {
    const item = { id: "1", name: "test", status: "pending" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(item),
    });

    await api.startDownload("magnet:?xt=urn:btih:abc", "movies");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/downloads",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ source: "magnet:?xt=urn:btih:abc", category: "movies" }),
      })
    );
  });

  it("cancelDownload sends DELETE", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(undefined),
    });

    await api.cancelDownload("abc-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/downloads/abc-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("not found"),
    });

    await expect(api.getDownloads()).rejects.toThrow("not found");
  });

  it("searchLibrary encodes query", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await api.searchLibrary("my movie");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/library/search?q=my%20movie",
      expect.any(Object)
    );
  });

  it("getEventsURL returns correct SSE URL", () => {
    expect(api.getEventsURL()).toBe("/api/downloads/events");
  });

  it("getLibrary with category filter", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await api.getLibrary("movies");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/library?category=movies",
      expect.any(Object)
    );
  });

  it("getRDDownloads with limit", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await api.getRDDownloads(10);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/rd/downloads?limit=10",
      expect.any(Object)
    );
  });
});
