"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DownloadItem } from "@/lib/types";
import { formatBytes, formatSpeed, formatETA, getStatusColor } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function DownloadCard({ item, onUpdate }: { item: DownloadItem; onUpdate: () => void }) {
  const isActive = ["downloading", "resolving", "pending", "moving"].includes(item.status);

  const handleCancel = async () => {
    try {
      await api.cancelDownload(item.id);
      toast.success("Download cancelled");
      onUpdate();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium truncate">{item.name}</p>
                </TooltipTrigger>
                <TooltipContent><p className="max-w-[280px] break-all text-xs">{item.name}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={item.category === "movies" ? "default" : "secondary"} className="text-[10px]">
                {item.category}
              </Badge>
              <span className={`text-xs capitalize ${getStatusColor(item.status)}`}>{item.status}</span>
            </div>
          </div>
          {isActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {item.status === "downloading" && (
          <>
            <Progress value={item.progress * 100} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatBytes(item.downloaded)} / {formatBytes(item.size)}</span>
              <span>{formatSpeed(item.speed)}</span>
              <span>ETA {formatETA(item.eta)}</span>
            </div>
          </>
        )}

        {item.status === "resolving" && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Resolving on Real-Debrid...</span>
          </div>
        )}

        {item.status === "moving" && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Moving to {item.category}...</span>
          </div>
        )}

        {item.status === "error" && item.error && (
          <p className="text-xs text-red-400 break-all">{item.error}</p>
        )}

        {item.status === "completed" && (
          <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
        )}
      </CardContent>
    </Card>
  );
}
