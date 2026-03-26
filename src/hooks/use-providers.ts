"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { Provider } from "@/lib/types";

let cachedProviders: Provider[] | null = null;

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>(cachedProviders || []);
  const [loading, setLoading] = useState(!cachedProviders);
  const fetched = useRef(false);

  useEffect(() => {
    if (cachedProviders || fetched.current) return;
    fetched.current = true;
    api.getProviders()
      .then((p) => {
        cachedProviders = p;
        setProviders(p);
      })
      .catch(() => {
        const fallback: Provider[] = [{ name: "realdebrid", displayName: "Real-Debrid" }];
        cachedProviders = fallback;
        setProviders(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  const hasMultiple = providers.length > 1;

  return { providers, loading, hasMultiple };
}
