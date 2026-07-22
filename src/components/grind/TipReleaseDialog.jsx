import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/grind";

const PRESETS = [0, 2, 5, 10];

export default function TipReleaseDialog({ open, onOpenChange, booking, onReleased }) {
  const [tip, setTip] = useState("0");
  const [saving, setSaving] = useState(false);
  const tipAmt = Math.max(0, Number(tip) || 0);
  const teenGets = booking.net_amount + tipAmt;

  const release = async () => {
    setSaving(true);
    // Release, earnings, wallet credit, notifications & referral all run server-side.
    // A tip must be paid through Stripe checkout before anything is credited.
    const res = await base44.functions.invoke("releasePayment", { bookingId: booking.id, tipAmount: tipAmt });
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
          <DialogTitle>Confirm & pay {booking.teen_display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Add a tip? (optional)</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTip(String(p))}
                  className={`rounded-xl border py-2 text-sm font-bold transition-colors ${
                    Number(tip) === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {p === 0 ? "None" : `$${p}`}
                </button>
              ))}
            </div>
            <Input type="number" min="0" className="rounded-xl mt-2" placeholder="Custom amount" value={tip} onChange={(e) => setTip(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1.5">100% of the tip goes straight into the teen's Kickstart Wallet.</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400"><span>Job payment (escrow)</span><span>{money(booking.net_amount)}</span></div>
            {tipAmt > 0 && <div className="flex justify-between text-xs text-emerald-600 font-semibold"><span>Tip</span><span>+{money(tipAmt)}</span></div>}
            <div className="flex justify-between font-bold text-slate-900"><span>{booking.teen_display_name} receives</span><span>{money(teenGets)}</span></div>
          </div>
          <Button className="w-full rounded-xl" disabled={saving} onClick={release}>
            {saving ? "Releasing..." : `Release ${money(teenGets)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}