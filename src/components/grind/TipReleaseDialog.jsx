import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";
import { creditWallet } from "@/lib/wallet";
import { completeReferralIfEligible } from "@/lib/referrals";

const PRESETS = [0, 2, 5, 10];

export default function TipReleaseDialog({ open, onOpenChange, booking, onReleased }) {
  const [tip, setTip] = useState("0");
  const [saving, setSaving] = useState(false);
  const tipAmt = Math.max(0, Number(tip) || 0);
  const teenGets = booking.net_amount + tipAmt;

  const release = async () => {
    setSaving(true);
    await base44.entities.Booking.update(booking.id, { payment_status: "released", tip_amount: tipAmt });
    await base44.entities.EarningsRecord.create({
      teen_user_id: booking.teen_user_id,
      booking_id: booking.id,
      listing_title: booking.listing_title,
      buyer_name: booking.buyer_name,
      amount: booking.price_total + tipAmt,
      net_amount: teenGets,
      occurred_at: new Date().toISOString(),
      tax_year: new Date().getFullYear(),
    });
    await creditWallet(booking.teen_user_id, teenGets, `"${booking.listing_title}" — ${booking.buyer_name}${tipAmt > 0 ? ` (incl. ${money(tipAmt)} tip)` : ""}`);
    await notify(booking.teen_user_id, { type: "payment", title: tipAmt > 0 ? `You got paid — plus a ${money(tipAmt)} tip! 🎉` : "You got paid!", body: `${money(teenGets)} landed in your Grind Wallet for "${booking.listing_title}".`, link: `/teen/wallet` });
    await notify(booking.parent_user_id, { type: "payment", title: "Payout released", body: `${money(teenGets)} from "${booking.listing_title}" is on its way to your account.`, link: `/parent/payouts` });
    await completeReferralIfEligible(booking.buyer_user_id, booking.id);
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
            <p className="text-xs text-slate-400 mt-1.5">100% of the tip goes straight into the teen's Grind Wallet.</p>
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