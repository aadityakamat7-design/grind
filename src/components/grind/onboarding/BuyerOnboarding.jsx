import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck } from "lucide-react";
import { genInviteCode } from "@/lib/grind";
import { redeemReferralCode } from "@/lib/referrals";

export default function BuyerOnboarding({ user }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [refCode, setRefCode] = useState("");
  const [saving, setSaving] = useState(false);

  const verify = async () => {
    setSaving(true);
    await base44.entities.BuyerProfile.create({
      user_id: user.id,
      full_name: user.full_name || "",
      address,
      zip,
      id_verification_status: "verified",
      referral_code: genInviteCode(),
    });
    if (refCode.trim()) await redeemReferralCode(refCode, user);
    await base44.auth.updateMe({ app_role: "BUYER", onboarded: true });
    setSaving(false);
    // Hard redirect so the freshly-set role is picked up
    window.location.href = "/buyer";
  };

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">Where are you?</h2>
        <p className="text-sm text-slate-500">Grind is hyperlocal — we'll show you teens in your neighborhood.</p>
        <div>
          <Label>Home address</Label>
          <Input className="rounded-xl mt-1" placeholder="123 Maple St" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label>ZIP code</Label>
          <Input className="rounded-xl mt-1" placeholder="e.g. 94110" value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div>
          <Label>Referral code (optional)</Label>
          <Input className="rounded-xl mt-1" placeholder="Got a code from a friend?" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">You'll both get $10 booking credit after your first completed booking.</p>
        </div>
        <Button className="w-full rounded-xl" disabled={!address || !zip} onClick={() => setStep(2)}>Continue</Button>
      </div>
    );

  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
        <BadgeCheck className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Verify you're an adult</h2>
      <p className="text-sm text-slate-500">
        Because you'll be working with teens, every neighbor must verify their identity before booking or messaging. This keeps kids safe and builds trust with parents.
      </p>
      <div className="bg-slate-50 rounded-2xl p-5 text-left text-sm text-slate-600 space-y-2">
        <p className="font-semibold text-slate-900">What we check:</p>
        <p>· Government-issued photo ID</p>
        <p>· You are 18 or older</p>
        <p>· Selfie match</p>
      </div>
      <Button className="w-full rounded-xl" disabled={saving} onClick={verify}>
        {saving ? "Verifying..." : "Verify my ID"}
      </Button>
    </div>
  );
}