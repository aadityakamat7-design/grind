import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { calcAge } from "@/lib/grind";
import LegalModal from "@/components/grind/LegalModal";

const TERMS_VERSION = "2026-07";

export default function ParentOnboarding({ user, initialCode = "" }) {
  const [code, setCode] = useState(initialCode);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [paymentAuth, setPaymentAuth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [legalModal, setLegalModal] = useState(null);

  useEffect(() => {
    (async () => {
      const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
      if (!profiles[0]) {
        await base44.entities.ParentProfile.create({ user_id: user.id, full_name: user.full_name || "" });
      }
    })();
  }, [user.id]);

  const link = async () => {
    setSaving(true);
    setError("");

    // Parents must be 18+ — they're the legal and financial account holder
    const age = calcAge(dob);
    if (age === null || age < 18) {
      setError("You must be at least 18 years old to be a parent or guardian on Kickstart.");
      setSaving(false);
      return;
    }

    let res;
    try {
      res = await base44.functions.invoke("confirmParentLink", {
        inviteCode: code.trim().toUpperCase(),
        attestRelationship: tosAccepted === true,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
      return;
    }
    if (!res.data?.linked) {
      setError(res.data?.error || "No teen found with that code — double-check and try again.");
      setSaving(false);
      return;
    }

    // Log consent: timestamp + terms version + payment authorization
    await base44.auth.updateMe({
      app_role: "parent",
      onboarded: true,
      date_of_birth: dob,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
      payment_auth_acknowledged_at: new Date().toISOString(),
    });
    setSaving(false);
    window.location.href = "/parent";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Link to your teen</h2>
      <p className="text-sm text-muted-foreground">
        Enter your teen's connection code to confirm your relationship and become their approved parent or guardian.
      </p>
      <div>
        <Label className="text-foreground">Enter your teen's connection code</Label>
        <Input
          className="rounded-xl mt-1 uppercase tracking-widest font-medium text-center text-lg"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
        />
      </div>
      <div>
        <Label className="text-foreground">Your date of birth</Label>
        <Input type="date" className="rounded-xl mt-1" value={dob} onChange={(e) => setDob(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">You must be 18 or older to manage your teen's account and payouts.</p>
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="bg-secondary border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You approve or deny every booking before it's confirmed.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You can read all of your teen's messages.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> All payments go to your payout account — never directly to the teen.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>I confirm I am this teen's parent or legal guardian and I accept the{" "}
          <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
          {" "}and{" "}
          <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={paymentAuth} onCheckedChange={setPaymentAuth} className="mt-0.5" />
        <span>I authorize Kickstart to process payments on my behalf, including holding funds in escrow and transferring payouts to my connected bank account.</span>
      </label>
      <Button className="w-full rounded-xl" disabled={!code || !dob || !tosAccepted || !paymentAuth || saving} onClick={link}>
        {saving ? "Linking..." : "Confirm & approve my teen"}
      </Button>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}