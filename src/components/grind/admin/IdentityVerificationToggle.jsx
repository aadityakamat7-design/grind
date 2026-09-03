import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";

// Admin-only toggle for Stripe Identity verification. When disabled, parents
// can link and approve bookings without government-ID verification. Connect
// onboarding for payouts stays required. Defaults to enabled (fails safe).
export default function IdentityVerificationToggle() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getIdentityVerificationStatus", {});
      setEnabled(res.data?.enabled !== false);
    } catch {
      setEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    setActing(true);
    try {
      const next = !enabled;
      await base44.functions.invoke("setIdentityVerificationStatus", { enabled: next });
      setEnabled(next);
    } catch {
      setEnabled(true);
    }
    setActing(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Stripe Identity verification
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            When enabled (default), parents must verify their government ID before approving bookings. Turn off for the pilot to let parents link without ID verification — Connect payout setup stays required. Re-enable before opening to strangers.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={
                "text-xs font-bold px-2.5 py-1 rounded-full " +
                (enabled ? "bg-emerald-50 text-emerald-600" : "bg-amber text-amber-foreground")
              }
            >
              {enabled ? "ON" : "OFF"}
            </span>
          )}
          <Button
            variant={enabled ? "outline" : "default"}
            size="sm"
            disabled={acting || loading}
            onClick={toggle}
          >
            {acting ? "…" : enabled ? "Turn off" : "Turn on"}
          </Button>
        </div>
      </div>
    </div>
  );
}