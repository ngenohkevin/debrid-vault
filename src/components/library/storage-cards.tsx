"use client";

import { HardDrive, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StorageInfo } from "@/lib/types";
import { formatBytes } from "@/lib/formatters";

export function StorageCards({ storage }: { storage: StorageInfo | null }) {
  if (!storage) return null;

  const cards = [
    { label: "NVMe (Staging)", icon: Database, usage: storage.nvme },
    { label: "External Drive", icon: HardDrive, usage: storage.external },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <card.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{card.label}</span>
            </div>
            <Progress value={card.usage.percent} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatBytes(card.usage.used)} used</span>
              <span>{formatBytes(card.usage.available)} free</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
