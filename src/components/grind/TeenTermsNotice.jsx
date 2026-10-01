import React from "react";
import { Info, X } from "lucide-react";
import { useTermsGate } from "@/lib/TermsGateContext";

// A teen under 18 whose parent hasn't yet accepted the updated Terms gets this
// small, dismissible notice — never a blocking pop-up. They keep using
// Blockwork while their parent reviews the update on their behalf.
export default function TeenTermsNotice() {
  const { teenNotice, dismissNotice } = useTermsGate();

  if (!teenNotice) return null;

  return (
    <div className="bg-secondary border-b border-border px-4 py-2.5">
      <div className="max-w-3xl mx-auto flex items-start gap-2.5">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p className="flex-1 text-[13px] text-muted-foreground leading-snug">
          Your parent needs to review updated Terms. You can keep using Blockwork in the meantime.
        </p>
        <button
          onClick={dismissNotice}
          aria-label="Dismiss notice"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}