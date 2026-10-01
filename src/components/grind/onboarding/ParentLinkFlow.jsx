import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import LegalModal from "@/components/grind/LegalModal";
import { CONSENT_ITEMS, CONSENT_VERSION, FULL_TERMS_TEXT } from "@/lib/stateWorkRules";
import StateRulesDisplay from "@/components/grind/parent/StateRulesDisplay";

// Linking a teen to a parent account:
//   Step 1 — the teen's connection code (the parent account already exists).
//   Step 2 — confirm it's the right teen, review the California child-labor
//            rules, enter the teen's date of birth, and accept each consent.
//
// Stripe is NOT part of linking. The parent's payout account is set up later,
// when the teen first cashes out. Used both by onboarding (right after the parent
// profile is saved) and by /parent/link (adding another teen later).
export default function ParentLinkFlow({ user, initialCode = "", onLinked }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState(initialCode);
  const [teenInfo, setTeenInfo] = useState(null);
  const [teenDob, setTeenDob] = useState("");
  const [consents, setConsents] = useState({});
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState(null);

  const allConsentsChecked = CONSENT_ITEMS.every((item) => consents[item.key] === true);
  const fail = (err) => err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.";

  const lookup = async () => {
    setError("");
    if (code.trim().length < 4) {
      setError("Please enter your teen's connection code.");
      return;
    }
    setLookingUp(true);
    try {
      const res = await base44.functions.invoke("lookupTeenByCode", { code: code.trim().toUpperCase() });
      if (res.data?.error) {
        setError(res.data.error);
        setLookingUp(false);
        return;
      }
      setTeenInfo(res.data);
      setStep(2);
    } catch (err) {
      setError(fail(err));
    }
    setLookingUp(false);
  };

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
      // Idempotent: the role is already granted by the parent profile step, and
      // the server ignores this if the account already has one.
      await base44.functions.invoke("saveSignupRole", { role: "parent" }).catch(() => {});
      // Record the acceptance for the parent and, since the link now exists, on
      // behalf of each linked teen.
      await base44.functions.invoke("acceptTerms", { accepted: true, userAgent: navigator.userAgent }).catch(() => {});
      await base44.auth.updateMe({
        terms_accepted_at: new Date().toISOString(),
        payment_auth_acknowledged_at: new Date().toISOString(),
      }).catch(() => {});
      localStorage.removeItem("grind_invite_code");
      setSaving(false);
      onLinked(teenInfo);
    } catch (err) {
      setError(fail(err));
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Link to your teen</h2>
        <p className="text-sm text-muted-foreground">
          Enter your teen's connection code to confirm your relationship and become their approved parent or guardian.
        </p>
        <div>
          <Label className="text-foreground">Your teen's connection code</Label>
          <Input
            className="rounded-xl mt-1 uppercase tracking-widest font-medium text-center text-lg h-12"
            placeholder="ABCD1234"
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={12}
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Your teen finds this on their Blockwork home screen.
          </p>
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive" role="alert">
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
        <Button className="w-full h-12 font-medium" disabled={code.trim().length < 4 || lookingUp} onClick={lookup}>
          {lookingUp ? "Looking up..." : "Look up teen & review rules"}
        </Button>
        <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setStep(1);
            setTeenInfo(null);
            setConsents({});
            setError("");
          }}
          className="p-1 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Back"
        >
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
        <Input type="date" className="rounded-xl mt-1 h-12" value={teenDob} onChange={(e) => setTeenDob(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">
          You confirm this is accurate. It's used to enforce California's age and hour limits. After you confirm it, your teen can't change it — changes go through you or an admin.
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground">Parental consent — check each box</p>
        {CONSENT_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2.5 text-[13px] text-foreground cursor-pointer leading-snug">
            <Checkbox
              checked={consents[item.key] === true}
              onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, [item.key]: checked === true }))}
              className="mt-0.5 shrink-0"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => setShowFullTerms((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors w-full"
      >
        {showFullTerms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {showFullTerms ? "Hide full terms" : "Read full terms"}
      </button>
      {showFullTerms && (
        <div className="bg-secondary border border-border rounded-xl p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{FULL_TERMS_TEXT}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button className="w-full h-12 font-medium" disabled={!allConsentsChecked || !teenDob || saving} onClick={submit}>
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