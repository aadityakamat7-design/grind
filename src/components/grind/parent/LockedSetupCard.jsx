import React from "react";
import { Link } from "react-router-dom";
import { Lock, ShieldCheck, Landmark, CheckCircle2 } from "lucide-react";

// Locked payout-setup card shown on the parent dashboard when identity or
// bank connection is not yet complete. Locked (non-interactive) until the
// linked teen has at least one job request (booking). Unlocks the moment
// a booking exists, linking to the approval page setup flow.
//
// Defaults to locked: if hasJobRequests is undefined/null/false, render locked.
export default function LockedSetupCard({ profile, hasJobRequests }) {
  const identityDone = !!profile?.is_identity_verified;
  const bankDone = profile?.connect_status === "active";
  const setupComplete = identityDone && bankDone;

  // Don't render if setup is already complete — PayoutStatusCard handles that
  if (setupComplete) return null;

  // Default to locked when data hasn't loaded
  const locked = !hasJobRequests;

  return (
    <div className={`bg-card rounded-2xl border border-border shadow-soft p-5 ${locked ? "opacity-70" : ""}`}>
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

      {locked ? (
        <button
          disabled
          aria-disabled="true"
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground h-11 font-medium text-sm cursor-not-allowed"
          style={{ pointerEvents: "none" }}
        >
          <Lock className="w-4 h-4" />
          Unlocks when your teen requests their first job
        </button>
      ) : (
        <Link to="/parent/approvals?setup=1" className="block mt-4">
          <button className="w-full rounded-xl bg-primary text-primary-foreground h-11 font-medium text-sm shadow-soft hover:bg-primary-hover transition-colors">
            Complete setup
          </button>
        </Link>
      )}
    </div>
  );
}