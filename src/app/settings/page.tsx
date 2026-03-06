"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Crown, HardDrive, LogOut, Gauge, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { RDUser, StorageInfo, EngineSettings } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatBytes } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const [user, setUser] = useState<RDUser | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    Promise.all([
      api.getRDUser().catch(() => null),
      api.getStorage().catch(() => null),
      api.getSettings().catch(() => null),
    ]).then(([u, s, eng]) => {
      setUser(u);
      setStorage(s);
      setSettings(eng);
      if (u?.expiration) {
        setDaysLeft(Math.max(0, Math.floor((new Date(u.expiration).getTime() - Date.now()) / 86400000)));
      }
      setLoading(false);
    });
  }, []);

  const updateSpeedLimit = async (mbps: number) => {
    try {
      const updated = await api.updateSettings({ speedLimitMbps: mbps });
      setSettings(updated);
      toast.success(mbps === 0 ? "Speed limit removed" : `Speed limit set to ${mbps} Mbps`);
    } catch {
      toast.error("Failed to update settings");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold">Settings</h1>
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold">Settings</h1>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Real-Debrid Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default" className="gap-1">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires</span>
                  <span className="text-sm">{new Date(user.expiration).toLocaleDateString()} ({daysLeft} days)</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to connect to Real-Debrid</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" /> Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storage ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NVMe (Staging)</span>
                    <span>{formatBytes(storage.nvme.used)} / {formatBytes(storage.nvme.total)}</span>
                  </div>
                  <Progress value={storage.nvme.percent} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">External Drive</span>
                    <span>{formatBytes(storage.external.used)} / {formatBytes(storage.external.total)}</span>
                  </div>
                  <Progress value={storage.external.percent} className="h-2" />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Storage info unavailable</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Download Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Speed Limit</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={settings.speedLimitMbps}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setSettings({ ...settings, speedLimitMbps: val });
                        }}
                        onBlur={(e) => updateSpeedLimit(parseFloat(e.target.value) || 0)}
                        className="w-20 h-8 text-sm text-right"
                      />
                      <span className="text-sm text-muted-foreground">Mbps</span>
                      {settings.speedLimitMbps > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                          onClick={() => updateSpeedLimit(0)}
                          title="Remove limit"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">0 = unlimited. Shared across all downloads.</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Concurrent</span>
                  <span className="text-sm font-medium">{settings.maxConcurrentDownloads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Segments/File</span>
                  <span className="text-sm font-medium">{settings.maxSegmentsPerFile}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Settings unavailable</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">App</span>
              <span>Debrid Vault v1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Backend</span>
              <span>Go + Gin</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frontend</span>
              <span>Next.js + shadcn/ui</span>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </AppShell>
  );
}
