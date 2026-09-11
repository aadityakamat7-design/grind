import React, { useState } from "react";
import { Phone, X } from "lucide-react";

// Highly visible emergency 911 button for the teen dashboard.
// One tap opens a confirm sheet; confirming dials 911 instantly via tel:911.
export default function EmergencyButton() {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-bold py-3.5 transition-colors shadow-glow active:scale-[0.98]"
      >
        <Phone className="w-5 h-5" /> Emergency · Call 911
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-dark/50 backdrop-blur-[2px]" onClick={() => setConfirming(false)}>
          <div
            className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-floating p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sm:hidden flex justify-center -mt-2 mb-2">
              <div className="w-10 h-1.5 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-heading text-foreground">Call 911?</h3>
              <button onClick={() => setConfirming(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This will dial 911 immediately. Only use this in a real emergency — injury, danger, or threat to your safety.
            </p>
            <div className="space-y-2">
              <a
                href="tel:911"
                onClick={() => setConfirming(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold py-3.5 transition-colors shadow-soft"
              >
                <Phone className="w-5 h-5" /> Yes, call 911 now
              </a>
              <button
                onClick={() => setConfirming(false)}
                className="w-full rounded-xl border border-border text-foreground font-semibold py-3 hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}