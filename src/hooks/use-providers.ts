"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Provider } from "@/lib/types";

let cachedProviders: Provider[] | null = null;

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>(cachedProviders || []);
  const [loading, setLoading] = useState(!cachedProviders);

  useEffect(() => {
    if (cachedProviders) {
      setProviders(cachedProviders);
      setLoading(false);
      return;
    }
    api.getProviders()
      .then((p) => {
        cachedProviders = p;
        setProviders(p);
      })
      .catch(() => {
        // Fallback: assume only RD is available
        const fallback: Provider[] = [{ name: "realdebrid", displayName: "Real-Debrid" }];
        cachedProviders = fallback;
        setProviders(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  const hasMultiple = providers.length > 1;

  return { providers, loading, hasMultiple };
}
