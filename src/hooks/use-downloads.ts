"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { DownloadItem } from "@/lib/types";

export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchDownloads = useCallback(async () => {
    try {
      const data = await api.getDownloads();
      setDownloads(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDownloads();

    const es = new EventSource(api.getEventsURL());
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const item: DownloadItem = parsed.data;
        setDownloads((prev) => {
          const idx = prev.findIndex((d) => d.id === item.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = item;
            return updated;
          }
          if (parsed.type === "added") return [item, ...prev];
          return prev;
        });
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setTimeout(() => {
        if (eventSourceRef.current === es) fetchDownloads();
      }, 3000);
    };

    return () => { es.close(); eventSourceRef.current = null; };
  }, [fetchDownloads]);

  return { downloads, loading, error, refresh: fetchDownloads };
}
