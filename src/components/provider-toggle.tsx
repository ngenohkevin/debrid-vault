"use client";

import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

const providerLabel: Record<string, string> = {
  realdebrid: "Real-Debrid",
  torbox: "TorBox",
};

export function ProviderToggle({
  providers,
  selected,
  onChange,
}: {
  providers: Provider[];
  selected: string;
  onChange: (provider: string) => void;
}) {
  if (providers.length <= 1) return null;

  return (
    <div className="inline-flex rounded-xl border border-border-card overflow-hidden text-[12px]">
      {providers.map((p) => (
        <button
          key={p.name}
          onClick={() => onChange(p.name)}
          className={cn(
            "px-3 py-1.5 font-medium transition-colors",
            selected === p.name
              ? "bg-accent-blue text-white"
              : "text-fg-secondary hover:bg-surface-secondary"
          )}
        >
          {p.displayName}
        </button>
      ))}
    </div>
  );
}

export function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;

  const label = providerLabel[provider] || provider;
  const color = provider === "torbox"
    ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
    : "bg-accent-blue/15 text-accent-blue border-accent-blue/30";

  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}
