import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { genInviteCode } from "@/lib/grind";
import { redeemReferralCode } from "@/lib/referrals";
import IdentityVerifyCard from "@/components/grind/parent/IdentityVerifyCard";

export default function BuyerOnboarding({ user }) {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [refCode, setRefCode] = useState("");
  const [saving, setSaving] = useState(false);

  const continueToVerify = async () => {
    setSaving(true);
    const existing = await base44.entities.BuyerProfile.filter({ user_id: user.id });
    if (!existing[0]) {
      // id_verification_status stays at its "pending" default — only the backend can mark it verified
      await base44.entities.BuyerProfile.create({
        user_id: user.id,
        full_name: user.full_name || "",
        address,
        zip,
        referral_code: genInviteCode(),
      });
      if (refCode.trim()) await redeemReferralCode(refCode, user);
    }
    setSaving(false);
    setStep(2);
  };

  const finish = async () => {
    await base44.auth.updateMe({ app_role: "BUYER", onboarded: true });
    // Hard redirect so the freshly-set role is picked up
    window.location.href = "/buyer";
  };

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">Where are you?</h2>
        <p className="text-sm text-slate-500">Kickstart is hyperlocal — we'll show you teens in your neighborhood.</p>
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
        <Button className="w-full rounded-xl" disabled={!address || !zip || saving} onClick={continueToVerify}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-slate-900">Verify you're an adult</h2>
      <p className="text-sm text-slate-500">
        Because you'll be working with teens, every neighbor must verify their identity before booking or messaging. This keeps kids safe and builds trust with parents.
      </p>
      <IdentityVerifyCard role="BUYER" onVerified={finish} />
    </div>
  );
}