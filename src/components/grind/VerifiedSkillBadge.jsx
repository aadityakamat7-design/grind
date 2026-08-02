import React from "react";
import { BadgeCheck } from "lucide-react";

// Renders one or more "Verified skill" badges for approved credentials.
// Distinct from the general Parent-approved / ID-verified trust badges.
export default function VerifiedSkillBadge({ credentials = [], className = "" }) {
  if (!credentials.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {credentials.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full bg-foreground text-background px-2.5 py-1 text-xs font-medium"
        >
          <BadgeCheck className="w-3.5 h-3.5" />
          {c.label} ✓ Verified
        </span>
      ))}
    </div>
  );
}