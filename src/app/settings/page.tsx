"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Crown, HardDrive, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { RDUser, StorageInfo } from "@/lib/types";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRDUser().catch(() => null),
      api.getStorage().catch(() => null),
    ]).then(([u, s]) => {
      setUser(u);
      setStorage(s);
      setLoading(false);
    });
  }, []);

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

  const daysLeft = user?.expiration
    ? Math.max(0, Math.floor((new Date(user.expiration).getTime() - Date.now()) / 86400000))
    : 0;

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
