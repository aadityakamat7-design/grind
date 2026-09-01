import { cn } from "@/lib/utils"

// Skeleton loader — warm shimmer, neutral surface (no brand tint).
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-xl", className)}
      {...props}
    />
  );
}

export { Skeleton }