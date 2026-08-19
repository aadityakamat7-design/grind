import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemReferralCode, REFERRAL_REWARD } from "@/lib/referrals";
import { money } from "@/lib/grind";

export default function RedeemReferralCard({ profile }) {
  const [code, setCode] = useState("");
  const [redeemed, setRedeemed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!profile?.user_id) return;
    (async () => {
      const mine = await base44.entities.Referral.filter({ referred_user_id: profile.user_id });
      if (mine[0]) setRedeemed(mine[0].code);
    })();
  }, [profile]);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg("");
    const ok = await redeemReferralCode(code, profile);
    if (ok) {
      setRedeemed(code.trim().toUpperCase());
      setCode("");
    } else {
      setMsg("That code couldn't be redeemed — it may be invalid, your own, or already used.");
    }
    setBusy(false);
  };

  if (redeemed) {
    return (
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Referral applied</p>
            <p className="text-xs text-slate-500 mt-0.5">
              You redeemed code{" "}
              <span className="font-bold tracking-widest text-violet-700">{redeemed}</span>. You and
              your friend each get {money(REFERRAL_REWARD)} credit after your first booking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Ticket className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">Have a referral code?</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Redeem a friend's code and you'll each get {money(REFERRAL_REWARD)} credit after your
            first booking.
          </p>
          <div className="flex gap-2 mt-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="bg-white tracking-widest font-bold text-sm h-10"
              maxLength={12}
            />
            <Button type="submit" size="sm" disabled={busy || !code.trim()} className="h-10">
              {busy ? "…" : "Redeem"}
            </Button>
          </div>
          {msg && <p className="text-xs text-amber-600 mt-2">{msg}</p>}
        </div>
      </div>
    </form>
  );
}