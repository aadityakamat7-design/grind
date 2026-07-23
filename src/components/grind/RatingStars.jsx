import React from "react";
import { Star } from "lucide-react";

export default function RatingStars({ rating = 0, count, size = "w-4 h-4", onSelect }) {
  // Defensive clamp: bad data (0, 6, NaN) should never render broken stars.
  const clamped = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          onClick={onSelect ? () => onSelect(i) : undefined}
          className={`${size} ${onSelect ? "cursor-pointer" : ""} ${
            i <= clamped ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
      {count !== undefined && <span className="text-xs text-muted-foreground ml-1">({count})</span>}
    </div>
  );
}