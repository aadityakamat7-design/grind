import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Sparkles, ChevronRight } from "lucide-react";

// A dismissible onboarding checklist that shows at the top of each role
// dashboard. Steps are passed in with a `completed` flag and optional `to`
// link. Auto-hides once every step is done.
export default function GetStartedCard({ storageKey, steps }) {
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "1"
  );

  if (dismissed) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  if (completedCount === steps.length) return null;

  const pct = Math.round((completedCount / steps.length) * 100);

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground text-[15px]">Get started</h3>
          <span className="text-[12px] text-muted-foreground font-medium">{completedCount}/{steps.length}</span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors -mr-1 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 pb-3">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="px-2 pb-2">
        {steps.map((step, i) => {
          if (step.completed) {
            return (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <span className="text-[13px] text-muted-foreground line-through">{step.label}</span>
              </div>
            );
          }
          if (step.to) {
            return (
              <Link
                key={i}
                to={step.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group"
              >
                <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                <span className="text-[13px] font-semibold text-foreground">{step.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-primary transition-colors" />
              </Link>
            );
          }
          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              <span className="text-[13px] font-semibold text-foreground">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}