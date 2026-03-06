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

    let retryTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      if (closed) return;
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
        es.close();
        if (closed) return;
        // Reconnect after 3s + refresh data
        retryTimer = setTimeout(() => {
          fetchDownloads();
          connect();
        }, 3000);
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [fetchDownloads]);

  return { downloads, loading, error, refresh: fetchDownloads };
}
