import React from "react";
import { Landmark, CheckCircle2 } from "lucide-react";

// Payout-setup card shown on the parent dashboard when the bank connection
// is not yet complete. The button is always active so the parent can set up
// payouts at any time.
export default function LockedSetupCard({ profile, onStartSetup }) {
  const bankDone = profile?.connect_status === "active";

  // Don't render if setup is already complete — PayoutStatusCard handles that
  if (bankDone) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <h3 className="font-bold text-foreground text-sm mb-4">Payout setup</h3>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
            <Landmark className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Bank connected</p>
            <p className="text-xs text-muted-foreground">
              {bankDone
                ? `${profile?.bank_name || "Bank"} ••••${profile?.bank_last4 || "????"}`
                : "Not started"}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onStartSetup}
        className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground h-11 font-medium text-sm shadow-soft hover:bg-primary-hover transition-colors"
      >
        <Landmark className="w-4 h-4" />
        Connect your bank
      </button>
    </div>
  );
}