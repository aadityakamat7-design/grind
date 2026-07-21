import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle, Landmark, Lock, BadgeCheck } from "lucide-react";
import IdentityVerifyCard from "@/components/grind/parent/IdentityVerifyCard";

export default function ParentOnboarding({ user, initialCode = "" }) {
  const [step, setStep] = useState(null); // 1 identity, 2 payouts, 3 link teen
  const [profile, setProfile] = useState(null);
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [legalName, setLegalName] = useState(user.full_name || "");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");

  const loadProfile = useCallback(async () => {
    const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
    const p = profiles[0] || null;
    setProfile(p);
    if (!p || !p.is_identity_verified) setStep(1);
    else if (p.connect_status !== "active") setStep(2);
    else setStep(3);
    return p;
  }, [user.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onVerified = useCallback(async () => {
    // Strip the identity_return param so a refresh doesn't re-check
    window.history.replaceState({}, "", window.location.pathname);
    const p = await loadProfile();
    if (p?.is_identity_verified) setStep(2);
  }, [loadProfile]);

  const activatePayouts = async () => {
    setSaving(true);
    await base44.entities.ParentProfile.update(profile.id, { connect_status: "active" });
    setSaving(false);
    setStep(3);
  };

  const link = async () => {
    setSaving(true);
    setError("");
    if (!profile?.is_identity_verified) {
      setError("Your identity must be verified before you can be linked to a teen.");
      setSaving(false);
      return;
    }
    const profiles = await base44.entities.TeenProfile.filter({ invite_code: code.trim().toUpperCase() });
    const teen = profiles[0];
    if (!teen) {
      setError("No teen found with that code. Double-check and try again.");
      setSaving(false);
      return;
    }
    await base44.entities.ParentTeenLink.create({
      parent_user_id: user.id,
      teen_user_id: teen.user_id,
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });
    await base44.entities.TeenProfile.update(teen.id, { status: "active", parent_identity_verified: true });
    await base44.auth.updateMe({ app_role: "PARENT", onboarded: true });
    setSaving(false);
    // Hard redirect so the freshly-set role is picked up
    window.location.href = "/parent";
  };

  if (step === null)
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">First, verify your identity</h2>
        <IdentityVerifyCard onVerified={onVerified} />
      </div>
    );

  if (step === 2)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
          <BadgeCheck className="w-4 h-4 shrink-0" /> Identity verified — you're all set as the account holder.
        </div>
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Landmark className="w-7 h-7 text-blue-500" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Set up payouts</h2>
        <p className="text-sm text-slate-500">
          As the account holder, all of your teen's earnings pay out to your bank account — never directly to them. We use Stripe to transfer funds.
        </p>
        <div>
          <Label>Legal name</Label>
          <Input className="rounded-xl mt-1" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Routing number</Label>
            <Input className="rounded-xl mt-1" placeholder="110000000" value={routing} onChange={(e) => setRouting(e.target.value)} />
          </div>
          <div>
            <Label>Account number</Label>
            <Input className="rounded-xl mt-1" placeholder="000123456789" value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Bank details are encrypted and handled by our payments partner.
        </p>
        <Button className="w-full rounded-xl" disabled={!legalName || !routing || !account || saving} onClick={activatePayouts}>
          {saving ? "Verifying..." : "Activate payouts"}
        </Button>
        <button onClick={() => setStep(3)} className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600">
          Skip for now — set up later in Payouts
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-slate-900">Link to your teen</h2>
      <p className="text-sm text-slate-500">
        Enter the code your teen shared with you. You'll become their legal and financial account holder — every booking needs your approval, and all their earnings pay out to you.
      </p>
      <div>
        <Label>Teen's parent code</Label>
        <Input
          className="rounded-xl mt-1 uppercase tracking-widest font-bold text-center text-lg"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="bg-emerald-50 rounded-xl p-4 space-y-2 text-xs text-emerald-800">
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You approve or deny every booking before it's confirmed.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You can read all of your teen's messages.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> All payments go to your payout account — never directly to the teen.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-slate-600 cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>I confirm I am this teen's parent or legal guardian and I accept the Terms of Service.</span>
      </label>
      <Button className="w-full rounded-xl" disabled={!code || !tosAccepted || saving} onClick={link}>
        {saving ? "Linking..." : "Confirm & approve my teen"}
      </Button>
    </div>
  );
}