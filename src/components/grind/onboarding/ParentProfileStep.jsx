import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle } from "lucide-react";
import LegalModal from "@/components/grind/LegalModal";
import { seededName, isRealName } from "@/lib/signupState";

const TERMS_VERSION = "2026-10-01";

// Parent sign-up, step 2: your legal name and the Terms. Nothing about money is
// asked for here — the payout account is set up later, when the teen first cashes
// out. Saving this grants the parent role on the server (saveSignupRole), which
// is what allows linking a teen on the next screen.
export default function ParentProfileStep({ user, onSaved }) {
  const seeded = seededName(user);
  const [firstName, setFirstName] = useState(seeded.split(" ")[0] || "");
  const [lastName, setLastName] = useState(seeded.split(" ").slice(1).join(" "));
  const [tosAccepted, setTosAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
      setError("Enter your legal first and last name — letters only, and not your email address.");
      return;
    }
    setSaving(true);
    try {
      const roleRes = await base44.functions.invoke("saveSignupRole", {
        role: "parent",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (roleRes.data?.error) {
        setError(roleRes.data.error);
        setSaving(false);
        return;
      }
      // Record the acceptance as a ConsentRecord — that record (not the stamp
      // below) is what the re-acceptance check reads.
      await base44.functions.invoke("acceptTerms", { accepted: true, userAgent: navigator.userAgent });
      await base44.auth.updateMe({
        legal_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        payment_auth_acknowledged_at: new Date().toISOString(),
      });
      setSaving(false);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Your parent account</h2>
      <p className="text-sm text-muted-foreground">
        Use your legal name — it's the name on your teen's account and the one that must match your bank account later.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label className="text-foreground">First name</Label>
          <Input
            className="rounded-xl mt-1 h-12"
            maxLength={48}
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="min-w-0">
          <Label className="text-foreground">Last name</Label>
          <Input
            className="rounded-xl mt-1 h-12"
            maxLength={48}
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="bg-secondary border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You approve or deny every service and every job before it goes ahead.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You can read all of your teen's messages.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> Payouts go to your account — never directly to your teen.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> No bank account needed now. You'll set up payouts when your teen is ready to cash out.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>
          I accept the{" "}
          <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
          {" "}and the{" "}
          <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
        </span>
      </label>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <Button className="w-full h-12 font-medium" disabled={!firstName || !lastName || !tosAccepted || saving} onClick={save}>
        {saving ? "Saving..." : "Continue"}
      </Button>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}