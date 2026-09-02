import React from "react";
import { ShieldCheck, Landmark, CheckCircle2 } from "lucide-react";

// Payout-setup card shown on the parent dashboard when identity or bank
// connection is not yet complete. The button is always active so the parent
// can verify and set up payouts at any time — no need to wait for a job request.
export default function LockedSetupCard({ profile, onStartSetup }) {
  const identityDone = !!profile?.is_identity_verified;
  const bankDone = profile?.connect_status === "active";
  const setupComplete = identityDone && bankDone;

  // Don't render if setup is already complete — PayoutStatusCard handles that
  if (setupComplete) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <h3 className="font-bold text-foreground text-sm mb-4">Payout setup</h3>

      <div className="space-y-3">
        {/* Step 1: Identity */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${identityDone ? "bg-emerald-50" : "bg-muted"}`}>
            {identityDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">1. Identity verified</p>
            <p className="text-xs text-muted-foreground">
              {identityDone ? "Verified ✓" : "Not started"}
            </p>
          </div>
        </div>

        {/* Step 2: Bank */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bankDone ? "bg-emerald-50" : "bg-muted"}`}>
            {bankDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Landmark className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">2. Bank connected</p>
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
        <ShieldCheck className="w-4 h-4" />
        {identityDone ? "Connect your bank" : "Verify my ID & set up payouts"}
      </button>
    </div>
  );
}