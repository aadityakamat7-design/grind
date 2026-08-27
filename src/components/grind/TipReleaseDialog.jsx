import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/grind";

const PRESETS = [0, 2, 5, 10];

// Buyer confirms the job is done correctly and optionally adds a tip. Payment
// is released to the teen's parent immediately (or after the tip clears Stripe).
export default function TipReleaseDialog({ open, onOpenChange, booking, onReleased }) {
  const [tip, setTip] = useState("0");
  const [saving, setSaving] = useState(false);
  const tipAmt = Math.max(0, Number(tip) || 0);
  const teenGets = (booking.net_amount || 0) + tipAmt;

  const confirm = async () => {
    setSaving(true);
    const res = await base44.functions.invoke("jobHandshake", {
      bookingId: booking.id,
      action: "confirm",
      tipAmount: tipAmt,
    });
    if (res.data?.url) {
      if (window.self !== window.top) {
        alert("Checkout only works from the published app. Open your app in a new tab to pay the tip.");
        setSaving(false);
        return;
      }
      window.location.href = res.data.url;
      return;
    }
    setSaving(false);
    onOpenChange(false);
    onReleased?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm job done & pay {booking.teen_display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">The work is done! Add a tip if you'd like — 100% goes to the teen.</p>
          <div>
            <Label>Add a tip? (optional)</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTip(String(p))}
                  className={`rounded-xl border py-2 text-sm font-bold transition-colors ${
                    Number(tip) === p ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {p === 0 ? "None" : `$${p}`}
                </button>
              ))}
            </div>
            <Input type="number" min="0" className="rounded-xl mt-2" placeholder="Custom amount" value={tip} onChange={(e) => setTip(e.target.value)} />
          </div>
          <div className="bg-secondary rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Job payment (escrow)</span><span>{money(booking.net_amount)}</span></div>
            {tipAmt > 0 && <div className="flex justify-between text-xs text-emerald-600 font-semibold"><span>Tip</span><span>+{money(tipAmt)}</span></div>}
            <div className="flex justify-between font-bold text-foreground"><span>{booking.teen_display_name} receives</span><span>{money(teenGets)}</span></div>
          </div>
          <Button className="w-full rounded-xl" disabled={saving} onClick={confirm}>
            {saving ? "Confirming..." : `Confirm & release ${money(teenGets)}`}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Payment is released to {booking.teen_display_name}'s parent immediately.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}