import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Gift, Copy, Check } from "lucide-react";
import { ensureReferralCode, REFERRAL_REWARD } from "@/lib/referrals";
import { money } from "@/lib/grind";

export default function ReferralCard({ profile }) {
  const [code, setCode] = useState(profile?.referral_code || "");
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const p = await ensureReferralCode(profile);
      setCode(p.referral_code);
      setReferrals(await base44.entities.Referral.filter({ referrer_user_id: profile.user_id }, "-created_date", 10));
    })();
  }, [profile]);

  if (!profile) return null;

  const earned = referrals.filter((r) => r.status === "completed").reduce((s, r) => s + (r.reward_amount || REFERRAL_REWARD), 0);

  const copy = () => {
    navigator.clipboard.writeText(`Join me on Kickstart — trusted teen help in our neighborhood! Use my code ${code} when you sign up and we both get ${money(REFERRAL_REWARD)} credit: ${window.location.origin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">Give {money(REFERRAL_REWARD)}, get {money(REFERRAL_REWARD)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Invite a friend — when they complete their first booking, you both get {money(REFERRAL_REWARD)} in booking credit.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="font-extrabold tracking-[0.2em] text-violet-700 bg-white rounded-lg px-3 py-1.5 text-sm border border-violet-200">
              {code || "······"}
            </span>
            <button onClick={copy} className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy invite"}
            </button>
          </div>
          {(profile.referral_credit > 0 || referrals.length > 0) && (
            <div className="mt-3 pt-3 border-t border-violet-100 space-y-1.5 text-xs">
              {profile.referral_credit > 0 && (
                <p className="font-bold text-emerald-600">{money(profile.referral_credit)} credit ready — applies to your next booking</p>
              )}
              {referrals.map((r) => (
                <div key={r.id} className="flex justify-between text-slate-500">
                  <span>{r.referred_name}</span>
                  <span className={r.status === "completed" ? "text-emerald-600 font-bold" : "text-amber-600"}>
                    {r.status === "completed" ? `+${money(r.reward_amount || REFERRAL_REWARD)}` : "First booking pending"}
                  </span>
                </div>
              ))}
              {earned > 0 && (
                <p className="text-slate-400">Total earned: {money(earned)}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}