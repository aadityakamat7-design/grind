import React from "react";
import { useTestMode } from "@/lib/useTestMode";
import { FlaskConical } from "lucide-react";

// Persistent banner shown at the top of every screen while Stripe test mode
// is on, so it can never be left on unnoticed. Renders nothing in live mode.
export default function TestModeBanner() {
  const { testMode } = useTestMode();
  if (!testMode) return null;
  return (
    <div className="w-full bg-amber text-amber-foreground px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-elevated">
      <FlaskConical className="w-4 h-4 shrink-0" />
      <span>TEST MODE — no real money. Stripe test keys are active.</span>
    </div>
  );
}