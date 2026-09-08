import React from "react";

// Three-blocks brand mark — the "block" in Blockwork. Three rounded
// squares arranged in an L (2×2 minus the top-right corner) inside a
// primary-colored rounded container. Used in the landing header and
// the dashboard sidebar / mobile top bar.
export default function BlockworkLogo({ size = 36, className = "" }) {
  return (
    <div
      className={`rounded-xl bg-primary flex items-center justify-center shadow-card shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="text-primary-foreground"
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="9" height="9" rx="2.5" fill="currentColor" />
        <rect x="2" y="13" width="9" height="9" rx="2.5" fill="currentColor" />
        <rect x="13" y="13" width="9" height="9" rx="2.5" fill="currentColor" />
      </svg>
    </div>
  );
}