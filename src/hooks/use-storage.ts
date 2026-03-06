"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { StorageInfo } from "@/lib/types";

export function useStorage() {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setStorage(await api.getStorage());
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  return { storage, loading };
}
