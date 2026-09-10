import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight } from "lucide-react";

// Guided spotlight tour: dims the screen, highlights one element, shows a
// short tooltip with Next / Skip. Targets are identified by data-tour attrs.
// Steps without a target show a centered tooltip (no spotlight).
export default function Tour({ steps, onComplete, onSkip }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!step) return;

    let el = null;
    if (step.target) {
      const els = document.querySelectorAll(`[data-tour="${step.target}"]`);
      for (const e of els) {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) { el = e; break; }
      }
    }

    if (!el) {
      setSpotlightRect(null);
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const inViewport = rect.top > 60 && rect.bottom < window.innerHeight - 80;

    if (!inViewport) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const compute = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSpotlightRect(r);
      const tooltipWidth = Math.min(300, window.innerWidth - 32);
      const tooltipHeight = 150;
      const gap = 12;
      const spaceBelow = window.innerHeight - r.bottom;
      const showBelow = spaceBelow > tooltipHeight + gap;
      let top = showBelow ? r.bottom + gap : Math.max(gap, r.top - tooltipHeight - gap);
      let left = r.left + r.width / 2 - tooltipWidth / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      setTooltipPos({ top, left, width: tooltipWidth });
    };

    const timer = setTimeout(compute, inViewport ? 0 : 400);

    const onResizeScroll = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSpotlightRect(r);
      const tooltipWidth = Math.min(300, window.innerWidth - 32);
      const tooltipHeight = 150;
      const gap = 12;
      const spaceBelow = window.innerHeight - r.bottom;
      const showBelow = spaceBelow > tooltipHeight + gap;
      let top = showBelow ? r.bottom + gap : Math.max(gap, r.top - tooltipHeight - gap);
      let left = r.left + r.width / 2 - tooltipWidth / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      setTooltipPos({ top, left, width: tooltipWidth });
    };
    window.addEventListener("resize", onResizeScroll);
    window.addEventListener("scroll", onResizeScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResizeScroll);
      window.removeEventListener("scroll", onResizeScroll, true);
    };
  }, [step]);

  if (!step) return null;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex(stepIndex + 1);
      setSpotlightRect(null);
      setTooltipPos(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Click catcher — clicking the dimmed area skips */}
      <div
        className="absolute inset-0"
        style={spotlightRect ? { background: "transparent" } : { background: "rgba(0,0,0,0.55)" }}
        onClick={onSkip}
      />

      {/* Spotlight cutout */}
      {spotlightRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-card rounded-2xl shadow-floating border border-border p-5"
        style={{
          top: tooltipPos ? tooltipPos.top : "50%",
          left: tooltipPos ? tooltipPos.left : "50%",
          width: tooltipPos ? tooltipPos.width : "min(300px, calc(100vw - 32px))",
          transform: tooltipPos ? "none" : "translate(-50%, -50%)",
          transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
            {stepIndex + 1} / {steps.length}
          </span>
          <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 className="font-bold text-foreground text-[15px] mb-1">{step.title}</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{step.subtitle}</p>
        <div className="flex items-center justify-between mt-4">
          <button onClick={onSkip} className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            Skip tour
          </button>
          <Button size="sm" onClick={handleNext}>
            {isLast ? "Done" : "Next"}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}