import React from "react";
import { cn } from "@/lib/utils";

export default function SkeletonCard({ className }) {
  return (
    <div className={cn("bg-card rounded-2xl border border-border p-4 space-y-3 min-h-[88px]", className)}>
      <div className="h-5 w-5 rounded-lg bg-muted skeleton-shimmer" />
      <div className="h-7 w-20 rounded-md bg-muted skeleton-shimmer" />
      <div className="h-3 w-16 rounded-md bg-muted skeleton-shimmer" />
    </div>
  );
}

export function SkeletonGrid({ count = 4, className }) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonList({ count = 3, className }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <div className="h-4 w-2/3 rounded-md bg-muted skeleton-shimmer" />
          <div className="h-3 w-1/3 rounded-md bg-muted skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}