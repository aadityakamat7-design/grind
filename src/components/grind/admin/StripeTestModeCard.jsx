import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2 } from "lucide-react";

// Admin-only Stripe test-mode toggle. Calls setTestMode (server-checked
// admin-only) and reflects the current state from getTestModeStatus.
export default function StripeTestModeCard() {
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getTestModeStatus", {});
      setTestMode(res.data?.testMode === true);
    } catch {
      setTestMode(false);
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
      const next = !testMode;
      await base44.functions.invoke("setTestMode", { enabled: next });
      setTestMode(next);
    } catch {
      setTestMode(false);
    }
    setActing(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-amber" /> Stripe test mode
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Routes every Stripe call through the test keys. Test cards work on the published app and no real money moves. A banner shows on every screen while this is on.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <span
              className={
                "text-xs font-bold px-2.5 py-1 rounded-full " +
                (testMode ? "bg-amber text-amber-foreground" : "bg-muted text-muted-foreground")
              }
            >
              {testMode ? "ON" : "OFF"}
            </span>
          )}
          <Button
            variant={testMode ? "destructive" : "default"}
            size="sm"
            disabled={acting || loading}
            onClick={toggle}
          >
            {acting ? "…" : testMode ? "Turn off" : "Turn on"}
          </Button>
        </div>
      </div>
    </div>
  );
}