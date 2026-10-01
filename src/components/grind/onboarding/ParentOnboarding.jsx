import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { calcAge } from "@/lib/grind";
import LegalModal from "@/components/grind/LegalModal";
import { CONSENT_ITEMS, CONSENT_VERSION, FULL_TERMS_TEXT } from "@/lib/stateWorkRules";
import StateRulesDisplay from "@/components/grind/parent/StateRulesDisplay";
import { isRealName } from "@/lib/signupState";

const TERMS_VERSION = "2026-10-01";

// Two-step parent onboarding:
//   Step 1: legal first and last name + your own date of birth (18+) + the
//           teen's connection code → look the teen up and show who it is.
//   Step 2: California child-labor rules + itemized consent + the teen's date of
//           birth → submit. The link is active right away.
//
// Stripe is NOT required to link. The parent's payout account is set up later
// (it's needed before the teen's first cash-out and before a payout can leave),
// so a parent can always link and their teen can start working.
export default function ParentOnboarding({ user, initialCode = "" }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState(initialCode);
  // Always empty to start. The platform sets full_name to the email username at
  // sign-up, which is never a legal name and must never be pre-filled here.
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [teenInfo, setTeenInfo] = useState(null);

  const [teenDob, setTeenDob] = useState("");
  const [consents, setConsents] = useState({});
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [done, setDone] = useState(false);

  const lookup = async () => {
    setError("");
    // Legal name: a real name — never the email username, digits or symbols.
    if (!isRealName(name, user.email)) {
      setError("Enter your legal first and last name — letters only, and not your email address.");
      return;
    }
    const age = calcAge(dob);
    if (age === null || age < 18) {
      setError("You must be at least 18 years old to be a parent or guardian on Blockwork.");
      return;
    }
    if (code.length < 4) {
      setError("Please enter your teen's connection code.");
      return;
    }
    setLookingUp(true);
    try {
      const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
      // Created here, once the legal name is entered, so the profile never holds
      // an empty or email-derived name.
      if (profiles[0]) {
        await base44.entities.ParentProfile.update(profiles[0].id, { full_name: name.trim(), dob });
      } else {
        await base44.entities.ParentProfile.create({ user_id: user.id, full_name: name.trim(), dob });
      }
      const res = await base44.functions.invoke("lookupTeenByCode", { code: code.trim().toUpperCase() });
      const data = res.data;
      if (data?.error) {
        setError(data.error);
        setLookingUp(false);
        return;
      }
      setTeenInfo(data);
      setStep(2);
      setLookingUp(false);
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.");
      setLookingUp(false);
    }
  };

  const allConsentsChecked = CONSENT_ITEMS.every((item) => consents[item.key] === true);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("confirmParentLink", {
        inviteCode: code.trim().toUpperCase(),
        attestRelationship: consents.relationship === true,
        consents,
        stateRulesAcknowledged: consents.labor_laws === true,
        stateRules: teenInfo?.stateRules,
        userAgent: navigator.userAgent,
        teenDob,
      });
      if (!res.data?.linked) {
        setError(res.data?.error || "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      // The server grants the parent role — it re-checks the parent's age and the
      // link that confirmParentLink just created before setting app_role.
      const roleRes = await base44.functions.invoke("saveSignupRole", {
        role: "parent",
        firstName: name.trim(),
        dateOfBirth: dob,
      });
      if (roleRes.data?.error) {
        setError(roleRes.data.error);
        setSaving(false);
        return;
      }
      // Record the acceptance as a ConsentRecord — for the parent and, since the
      // link now exists, on behalf of each linked teen. This (not the stamp
      // below) is what the re-acceptance check reads.
      await base44.functions.invoke("acceptTerms", {
        accepted: true,
        userAgent: navigator.userAgent,
      });
      await base44.auth.updateMe({
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        payment_auth_acknowledged_at: new Date().toISOString(),
      });
      localStorage.removeItem("grind_invite_code");
      setSaving(false);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(1);
    setTeenInfo(null);
    setConsents({});
    setError("");
  };

  if (done)
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You're linked!</h2>
        <p className="text-sm text-muted-foreground">
          You're your teen's approved parent. They can post services and take jobs now, and you'll approve each one.
          Connect your payout account when you're ready so they can cash out.
        </p>
        <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/parent"; }}>
          Go to dashboard
        </Button>
      </div>
    );

  // Step 1: your legal name + DOB + the teen's code
  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Link to your teen</h2>
        <p className="text-sm text-muted-foreground">
          Enter your teen's connection code to confirm your relationship and become their approved parent or guardian.
        </p>
        <div>
          <Label className="text-foreground">Legal first and last name</Label>
          <Input
            className="rounded-xl mt-1"
            placeholder="e.g. Alex Rivera"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use your legal name. It must match your bank account.
          </p>
        </div>
        <div>
          <Label className="text-foreground">Your date of birth</Label>
          <Input type="date" className="rounded-xl mt-1" value={dob} onChange={(e) => setDob(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">You must be 18 or older to manage your teen's account and payouts.</p>
        </div>
        <div>
          <Label className="text-foreground">Enter your teen's connection code</Label>
          <Input
            className="rounded-xl mt-1 uppercase tracking-widest font-medium text-center text-lg"
            placeholder="ABCD1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
          />
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="bg-secondary border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You approve or deny every service and every job before it goes ahead.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> You can read all of your teen's messages.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> All payments go to your payout account — never directly to the teen.</p>
          <p className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> No bank account needed to link. You'll set up payouts when your teen is ready to cash out.</p>
        </div>
        <Button className="w-full rounded-xl" disabled={!name.trim() || !code || !dob || lookingUp} onClick={lookup}>
          {lookingUp ? "Looking up..." : "Look up teen & review rules"}
        </Button>
        <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
      </div>
    );
  }

  // Step 2: confirm the teen, the state rules, consent, and the teen's DOB
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={reset} className="p-1 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Consent & link</h2>
      </div>

      <div className="bg-secondary rounded-xl px-3.5 py-2.5 border border-border">
        <p className="text-xs font-bold text-foreground">
          Confirm this is your teen: {teenInfo?.teenName}
          {teenInfo?.teenState && ` · ${teenInfo?.teenState}`}
          {teenInfo?.teenAge != null && ` · Age ${teenInfo?.teenAge}`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          If this isn't the right teen, go back and check the code — never link to an account you don't recognize.
        </p>
      </div>

      <div>
        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> California child-labor rules
        </p>
        <StateRulesDisplay stateRules={teenInfo?.stateRules} teenName={teenInfo?.teenName} />
      </div>

      <div>
        <Label className="text-foreground">{teenInfo?.teenName || "Your teen"}'s date of birth</Label>
        <Input type="date" className="rounded-xl mt-1" value={teenDob} onChange={(e) => setTeenDob(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">
          You confirm this is accurate. It's used to enforce California's age and hour limits. After you confirm it, your teen can't change it — changes go through you or admin.
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground">Parental consent — check each box</p>
        {CONSENT_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2.5 text-[13px] text-slate-700 cursor-pointer leading-snug">
            <Checkbox
              checked={consents[item.key] === true}
              onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, [item.key]: checked === true }))}
              className="mt-0.5 shrink-0"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {/* Collapsible full legal terms — available but not blocking comprehension */}
      <button
        onClick={() => setShowFullTerms((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors w-full"
      >
        {showFullTerms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFullTerms ? "Hide full terms" : "Read full terms"}
      </button>
      {showFullTerms && (
        <div className="bg-secondary border border-border rounded-xl p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {FULL_TERMS_TEXT}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        className="w-full rounded-xl"
        disabled={!allConsentsChecked || !teenDob || saving}
        onClick={submit}
      >
        {saving ? "Linking..." : `Confirm & approve my teen (consent v${CONSENT_VERSION})`}
      </Button>
      {!allConsentsChecked && (
        <p className="text-[11px] text-muted-foreground text-center">
          {CONSENT_ITEMS.filter((i) => consents[i.key] !== true).length} of {CONSENT_ITEMS.length} consent items still need to be checked
        </p>
      )}
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}