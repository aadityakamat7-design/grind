import React, { useState, useEffect } from "react";
import ScrambleText from "@/components/landing/ScrambleText";

// Phrases that tile across the auth-page background, decoding from scrambled
// text into real Blockwork copy on load. Decorative only — aria-hidden, not in
// the tab order, very low opacity so it never competes with the form.
const PHRASES = [
  "Neighborhood work.",
  "Neighborhood teens.",
  "The neighborhood marketplace where teens find safe local work — with a parent approving every step.",
  "Every job parent-approved",
  "ID-verified neighbors",
  "Payments held safely in escrow",
];

// Pre-placed tiles at varied sizes/positions so the backdrop feels like
// atmosphere, not a grid. Staggered ~120ms apart so the whole field resolves
// into place rather than decoding in unison. Plays once on mount.
const TILES = [
  { t: 0, top: "4%", left: "2%", size: "text-2xl", delay: 0.10, maxW: "" },
  { t: 1, top: "11%", left: "54%", size: "text-xl", delay: 0.22, maxW: "" },
  { t: 2, top: "22%", left: "5%", size: "text-sm", delay: 0.35, maxW: "max-w-[240px]" },
  { t: 3, top: "34%", left: "56%", size: "text-lg", delay: 0.48, maxW: "" },
  { t: 4, top: "44%", left: "8%", size: "text-base", delay: 0.60, maxW: "" },
  { t: 5, top: "52%", left: "50%", size: "text-lg", delay: 0.72, maxW: "" },
  { t: 0, top: "64%", left: "4%", size: "text-3xl", delay: 0.85, maxW: "" },
  { t: 1, top: "74%", left: "46%", size: "text-xl", delay: 0.98, maxW: "" },
  { t: 3, top: "84%", left: "10%", size: "text-base", delay: 1.10, maxW: "" },
  { t: 4, top: "6%", left: "66%", size: "text-sm", delay: 0.16, maxW: "" },
  { t: 5, top: "28%", left: "68%", size: "text-sm", delay: 0.42, maxW: "" },
  { t: 2, top: "58%", left: "60%", size: "text-xs", delay: 0.78, maxW: "max-w-[180px]" },
  { t: 1, top: "40%", left: "26%", size: "text-2xl", delay: 0.55, maxW: "" },
  { t: 0, top: "78%", left: "58%", size: "text-xl", delay: 1.05, maxW: "" },
  { t: 5, top: "92%", left: "48%", size: "text-base", delay: 1.18, maxW: "" },
];

export default function DecodeBackdrop() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      {TILES.map((tile, i) => {
        const text = PHRASES[tile.t];
        return (
          <span
            key={i}
            className={`absolute ${tile.size} ${tile.maxW} font-heading whitespace-nowrap`}
            style={{
              top: tile.top,
              left: tile.left,
              color: "hsl(224 76% 48% / 0.09)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {reducedMotion ? (
              text
            ) : (
              <ScrambleText text={text} delay={tile.delay} />
            )}
          </span>
        );
      })}
    </div>
  );
}