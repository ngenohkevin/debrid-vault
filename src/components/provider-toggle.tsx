"use client";

import type { Provider } from "@/lib/types";

const providerColors: Record<string, string> = {
  realdebrid: "bg-blue-500 text-white",
  torbox: "bg-teal-500 text-white",
};

const providerInactiveColors: Record<string, string> = {
  realdebrid: "hover:bg-blue-500/10 text-blue-400",
  torbox: "hover:bg-teal-500/10 text-teal-400",
};

const providerShort: Record<string, string> = {
  realdebrid: "RD",
  torbox: "TB",
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
    <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
      {providers.map((p) => (
        <button
          key={p.name}
          onClick={() => onChange(p.name)}
          className={`px-2.5 py-1 transition-colors font-medium ${
            selected === p.name
              ? providerColors[p.name] || "bg-primary text-primary-foreground"
              : providerInactiveColors[p.name] || "hover:bg-accent text-muted-foreground"
          }`}
        >
          {p.displayName}
        </button>
      ))}
    </div>
  );
}

export function ProviderBadge({ provider }: { provider?: string }) {
  if (!provider) return null;

  const label = providerShort[provider] || provider;
  const color = provider === "torbox"
    ? "bg-teal-500/15 text-teal-400 border-teal-500/30"
    : "bg-blue-500/15 text-blue-400 border-blue-500/30";

  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}
