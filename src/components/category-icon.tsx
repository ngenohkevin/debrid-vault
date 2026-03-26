"use client";

import { Film, Tv, Music2 } from "lucide-react";
import type { Category } from "@/lib/types";

const categoryConfig: Record<Category, { icon: typeof Film; color: string; bg: string }> = {
  movies: { icon: Film, color: "text-accent-blue", bg: "bg-cat-movie-bg" },
  "tv-shows": { icon: Tv, color: "text-accent-purple", bg: "bg-cat-tv-bg" },
  music: { icon: Music2, color: "text-accent-green", bg: "bg-cat-music-bg" },
};

export function CategoryIcon({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const config = categoryConfig[category] || categoryConfig.movies;
  const Icon = config.icon;
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconDim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={`${dim} rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
      <Icon className={`${iconDim} ${config.color}`} />
    </div>
  );
}

export function getCategoryColor(category: Category): string {
  return categoryConfig[category]?.color || "text-accent-blue";
}

export function getCategoryBarColor(category: Category): string {
  const map: Record<Category, string> = {
    movies: "bg-accent-blue",
    "tv-shows": "bg-accent-purple",
    music: "bg-accent-green",
  };
  return map[category] || "bg-accent-blue";
}
