"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Info, AlertTriangle, Pause, Play } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { RDUser, StorageInfo, EngineSettings, Provider } from "@/lib/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProviderInfo {
  name: string;
  displayName: string;
  user: RDUser | null;
  error: string | null;
  daysLeft: number;
  planLabel: string;
  expired: boolean;
  paused: boolean;
}

function getDaysLeft(expiration: string): number {
  return Math.max(0, Math.floor((new Date(expiration).getTime() - Date.now()) / 86400000));
}

function getPlanLabel(provider: string, user: RDUser | null): string {
  if (!user) return "Unknown";
  if (provider === "torbox") return user.type || "Pro";
  return user.premium > 0 ? "Premium" : "Free";
}

export default function SettingsPage() {
  const router = useRouter();
  const [providerInfos, setProviderInfos] = useState<ProviderInfo[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [speedLimit, setSpeedLimit] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [storageResult, settingsResult, providersResult] = await Promise.all([
        api.getStorage().catch(() => null),
        api.getSettings().catch(() => null),
        api.getProviders().catch(() => [] as Provider[]),
      ]);

      if (cancelled) return;

      // Fetch user info for each provider independently — don't let one failure crash others
      const infos: ProviderInfo[] = await Promise.all(
        providersResult.map(async (p) => {
          let user: RDUser | null = null;
          let error: string | null = null;
          try {
            user = await api.getRDUser(p.name);
          } catch (err) {
            error = err instanceof Error ? err.message : "Failed to connect";
          }
          const daysLeft = user?.expiration ? getDaysLeft(user.expiration) : 0;
          const expired = user ? (user.premium <= 0 || daysLeft <= 0) : false;
          return {
            name: p.name,
            displayName: p.displayName,
            user,
            error,
            daysLeft,
            planLabel: getPlanLabel(p.name, user),
            expired,
            paused: p.paused || false,
          };
        })
      );

      if (cancelled) return;
      setProviderInfos(infos);
      setStorage(storageResult);
      setSettings(settingsResult);
      if (settingsResult) setSpeedLimit(settingsResult.speedLimitMbps);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleTogglePause = async (providerName: string, currentlyPaused: boolean) => {
    try {
      if (currentlyPaused) {
        await api.resumeProvider(providerName);
      } else {
        await api.pauseProvider(providerName);
      }
      setProviderInfos((prev) =>
        prev.map((p) => p.name === providerName ? { ...p, paused: !currentlyPaused } : p)
      );
      toast.success(currentlyPaused ? `${providerName} resumed` : `${providerName} paused`);
    } catch { toast.error("Failed to update provider"); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  };

  const handleSpeedChange = async (value: number) => {
    setSpeedLimit(value);
    try { await api.updateSettings({ speedLimitMbps: value }); }
    catch { toast.error("Failed to update speed limit"); }
  };

  const handleConcurrentChange = async (value: number) => {
    if (!settings) return;
    setSettings({ ...settings, maxConcurrentDownloads: value });
    try {
      const result = await api.updateSettings({ maxConcurrentDownloads: value });
      setSettings(result);
    } catch { toast.error("Failed to update"); }
  };

  const handleSegmentsChange = async (value: number) => {
    if (!settings) return;
    setSettings({ ...settings, maxSegmentsPerFile: value });
    try {
      const result = await api.updateSettings({ maxSegmentsPerFile: value });
      setSettings(result);
    } catch { toast.error("Failed to update"); }
  };

  const concurrentOptions = [1, 2, 4, 6, 8];
  const segmentOptions = [2, 4, 8, 12, 16];

  if (loading) {
    return (
      <AppShell>
        <div className="p-5 md:p-8 space-y-5 max-w-lg mx-auto">
          <PageHeader title="Settings" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl bg-surface-secondary" />)}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-5 md:p-8 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-fg-primary">Settings</h1>
          <button className="p-2 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-surface-secondary transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>

        {/* Providers */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Providers</h2>

          {providerInfos.map((p) => (
            <div key={p.name} className={cn("rounded-2xl border bg-surface-secondary p-4", p.paused ? "border-accent-amber/30" : "border-border-card")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full",
                    p.paused ? "bg-accent-amber" : p.error ? "bg-accent-red" : p.expired ? "bg-accent-amber" : "bg-accent-green"
                  )} />
                  <div>
                    <p className="text-[14px] font-semibold text-fg-primary">{p.displayName}</p>
                    <p className="text-[12px] text-fg-secondary">
                      {p.paused ? "Paused" : p.error ? "Connection error" : p.user?.username || "Connected"}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {p.error ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-red/20 text-accent-red">
                      <AlertTriangle className="h-3 w-3" /> Error
                    </span>
                  ) : p.expired ? (
                    <>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-amber/20 text-accent-amber">Expired</span>
                      <p className="text-[11px] font-mono text-accent-amber">Renew subscription</p>
                    </>
                  ) : p.paused ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-amber/20 text-accent-amber">Paused</span>
                  ) : (
                    <>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/20 text-accent-green">{p.planLabel}</span>
                      {p.daysLeft > 0 && <p className="text-[11px] font-mono text-accent-green">{p.daysLeft} days left</p>}
                    </>
                  )}
                </div>
              </div>
              {p.error && (
                <p className="mt-2 text-[11px] text-accent-red">{p.error}</p>
              )}
              {!p.error && !p.expired && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleTogglePause(p.name, p.paused)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] transition-colors",
                      p.paused
                        ? "border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10"
                        : "border-border-card text-fg-secondary hover:bg-surface-tertiary"
                    )}
                  >
                    {p.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    {p.paused ? "Resume" : "Pause"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {providerInfos.length === 0 && (
            <div className="rounded-2xl border border-border-card bg-surface-secondary p-4 text-center">
              <p className="text-[13px] text-fg-muted">No providers configured</p>
            </div>
          )}
        </section>

        {/* Storage */}
        {storage && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-border-card bg-surface-secondary p-4 space-y-4">
              <h3 className="text-[14px] font-semibold text-fg-primary">Storage</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-secondary">NVMe (Staging)</span>
                  <span className="text-[12px] font-mono text-fg-primary">{Math.round(storage.nvme.used / (1024 ** 3))} / {Math.round(storage.nvme.total / (1024 ** 3))} GB</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                  <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${storage.nvme.percent}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-secondary">External (Media)</span>
                  <span className="text-[12px] font-mono text-fg-primary">{Math.round(storage.external.used / (1024 ** 3))} / {Math.round(storage.external.total / (1024 ** 3))} GB</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                  <div className="h-full rounded-full bg-accent-amber transition-all" style={{ width: `${storage.external.percent}%` }} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Download Engine */}
        {settings && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-border-card bg-surface-secondary p-4 space-y-5">
              <h3 className="text-[14px] font-semibold text-fg-primary">Download Engine</h3>

              {/* Max Concurrent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-secondary">Max Concurrent Downloads</span>
                  <span className="text-[14px] font-mono font-semibold text-fg-primary">{settings.maxConcurrentDownloads}</span>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-border-card">
                  {concurrentOptions.map((v) => (
                    <button key={v} onClick={() => handleConcurrentChange(v)}
                      className={cn("flex-1 py-2 text-[12px] font-medium transition-colors",
                        settings.maxConcurrentDownloads === v ? "bg-accent-blue text-white" : "text-fg-secondary hover:bg-surface-tertiary")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Segments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-secondary">Max Segments per File</span>
                  <span className="text-[14px] font-mono font-semibold text-fg-primary">{settings.maxSegmentsPerFile}</span>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-border-card">
                  {segmentOptions.map((v) => (
                    <button key={v} onClick={() => handleSegmentsChange(v)}
                      className={cn("flex-1 py-2 text-[12px] font-medium transition-colors",
                        settings.maxSegmentsPerFile === v ? "bg-accent-blue text-white" : "text-fg-secondary hover:bg-surface-tertiary")}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Limit Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-fg-secondary">Speed Limit</span>
                  <span className="text-[14px] font-mono font-semibold text-fg-primary">
                    {speedLimit === 0 ? "Unlimited" : `${speedLimit} Mbps`}
                  </span>
                </div>
                <Slider
                  value={[speedLimit]}
                  onValueChange={(v) => setSpeedLimit(v[0])}
                  onValueCommit={(v) => handleSpeedChange(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-[10px] text-fg-muted">
                  <span>1 Mbps</span>
                  <span>Unlimited</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-red/10 text-accent-red text-[13px] font-medium hover:bg-accent-red/20 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </AppShell>
  );
}
