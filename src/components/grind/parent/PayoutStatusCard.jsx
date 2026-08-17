import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Landmark, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import IdentityVerificationGate from "@/components/grind/parent/IdentityVerificationGate";

// Status card shown on the parent dashboard ONLY after setup is complete
// (identity verified + bank connected). The setup prompt itself lives
// exclusively on the approval page — this card never renders as a prompt
// or locked placeholder. The "Manage" button opens the gate to let the
// parent update their bank connection if needed.
export default function PayoutStatusCard({ profile, onUpdated, returnPath = "/parent" }) {
  const [gateOpen, setGateOpen] = useState(false);

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
        initialStep="bank"
      />

      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <h3 className="font-bold text-foreground text-sm mb-4">Payout setup</h3>

        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">1. Identity verified</p>
            <p className="text-xs text-muted-foreground">Verified ✓</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">2. Bank connected</p>
            <p className="text-xs text-muted-foreground">
              {profile.bank_name || "Bank"} ••••{profile.bank_last4 || "????"} · Active
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full rounded-xl mt-4" onClick={() => setGateOpen(true)}>
          Manage payout account
          <ChevronRight className="w-4 h-4" />
        </Button>

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