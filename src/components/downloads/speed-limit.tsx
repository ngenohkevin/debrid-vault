"use client";

import { useState, useEffect, useRef } from "react";
import { Gauge, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PRESETS = [5, 10, 25, 50, 100];

interface SpeedLimitProps {
  compact?: boolean;
}

export function SpeedLimit({ compact = false }: SpeedLimitProps) {
  const [current, setCurrent] = useState(0);
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getSettings().then((s) => setCurrent(s.speedLimitMbps)).catch(() => {});
  }, []);

  useEffect(() => {
    if (showCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustom]);

  const apply = async (mbps: number) => {
    const prev = current;
    setCurrent(mbps);
    setShowCustom(false);
    setCustomValue("");
    try {
      await api.updateSettings({ speedLimitMbps: mbps });
      if (mbps > 0) {
        toast.success(`Limit: ${mbps} Mbps`);
      } else {
        toast.success("Limit removed");
      }
    } catch {
      setCurrent(prev);
      toast.error("Failed to update");
    }
  };

  const handleCustomSubmit = () => {
    const val = parseFloat(customValue);
    if (val > 0) {
      apply(val);
    } else {
      setShowCustom(false);
      setCustomValue("");
    }
  };

  const isCustomActive = current > 0 && !PRESETS.includes(current);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <Gauge className={`shrink-0 ${current > 0 ? "text-amber-400" : "text-muted-foreground"} ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />

      <div className="flex items-center gap-1 flex-wrap">
        {/* Unlimited */}
        <button
          onClick={() => current !== 0 && apply(0)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            current === 0
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Unlimited
        </button>

        {/* Presets */}
        {PRESETS.map((mbps) => (
          <button
            key={mbps}
            onClick={() => apply(mbps)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              current === mbps
                ? "bg-amber-500/90 text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {mbps}
          </button>
        ))}

        {/* Custom */}
        {showCustom ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="number"
              min={1}
              step={1}
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
                if (e.key === "Escape") { setShowCustom(false); setCustomValue(""); }
              }}
              onBlur={handleCustomSubmit}
              placeholder="Mbps"
              className="h-6 w-16 rounded-full text-[11px] text-center px-2"
            />
          </div>
        ) : (
          <button
            onClick={() => { setShowCustom(true); setCustomValue(isCustomActive ? String(current) : ""); }}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              isCustomActive
                ? "bg-amber-500/90 text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {isCustomActive ? `${current}` : "Custom"}
          </button>
        )}

        {/* Unit label */}
        <span className="text-[10px] text-muted-foreground ml-0.5">Mbps</span>

        {/* Clear button when active */}
        {current > 0 && (
          <button
            onClick={() => apply(0)}
            className="ml-0.5 rounded-full p-1 text-muted-foreground hover:text-red-400 hover:bg-muted/60 transition-colors"
            title="Remove limit"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
