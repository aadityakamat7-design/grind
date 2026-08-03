import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Landmark, CheckCircle2, AlertCircle, ChevronRight, Lock } from "lucide-react";
import IdentityVerificationGate from "@/components/grind/parent/IdentityVerificationGate";

// Persistent card on the parent dashboard showing the two-step payout setup
// status: identity verification + Stripe Connect bank connection.
// The "Manage" button opens the guided gate at whichever step is incomplete.
export default function PayoutStatusCard({ profile, onUpdated, returnPath = "/parent", locked = false }) {
  const [gateOpen, setGateOpen] = useState(false);

  const identityDone = profile?.is_identity_verified;
  const bankDone = profile?.connect_status === "active";
  const initialStep = identityDone ? "bank" : "verify";
  const setupComplete = identityDone && bankDone;
  // Only show the locked state when setup is incomplete — once complete the
  // card is always a permanent, manageable status card.
  const isLocked = locked && !setupComplete;

  const handleVerified = () => {
    setGateOpen(false);
    onUpdated?.();
  };

  return (
    <>
      <IdentityVerificationGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        onVerified={handleVerified}
        initialStep={initialStep}
      />

      <div className={`bg-card rounded-2xl border border-border shadow-soft p-5 ${isLocked ? "opacity-50 pointer-events-none" : ""}`}>
        <h3 className="font-bold text-foreground text-sm mb-4">Payout setup</h3>

        {/* Step 1 — Identity */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${identityDone ? "bg-emerald-50" : "bg-amber-50"}`}>
            {identityDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">1. Verify your identity</p>
            <p className="text-xs text-muted-foreground">
              {identityDone ? "Verified ✓" : "Required before approving jobs"}
            </p>
          </div>
        </div>

        {/* Step 2 — Bank */}
        <div className="flex items-center gap-3 pt-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bankDone ? "bg-emerald-50" : "bg-amber-50"}`}>
            {bankDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Landmark className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">2. Connect your bank</p>
            <p className="text-xs text-muted-foreground">
              {bankDone
                ? `${profile.bank_name || "Bank"} ••••${profile.bank_last4 || "????"} · Active`
                : identityDone
                  ? "Connect to receive payouts"
                  : "Available after identity verification"}
            </p>
          </div>
        </div>

        {isLocked ? (
          <>
            <Button className="w-full rounded-xl mt-4" disabled>
              <Lock className="w-4 h-4 mr-1.5" /> Complete setup
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Unlocks when your teen requests their first job.
            </p>
          </>
        ) : !identityDone || !bankDone ? (
          <Button className="w-full rounded-xl mt-4" onClick={() => setGateOpen(true)}>
            {identityDone ? "Connect bank account" : "Complete setup"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" className="w-full rounded-xl mt-4" onClick={() => setGateOpen(true)}>
            Manage payout account
          </Button>
        )}

        {profile?.connect_status === "restricted" && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-700 mt-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Stripe needs more information before payouts can resume. Tap "Manage" to fix it.</span>
          </div>
        )}
      </div>
    </>
  );
}