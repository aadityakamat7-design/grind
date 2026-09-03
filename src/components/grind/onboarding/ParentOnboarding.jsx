import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle, ArrowLeft, FileText } from "lucide-react";
import { calcAge } from "@/lib/grind";
import LegalModal from "@/components/grind/LegalModal";
import { CONSENT_ITEMS, CONSENT_VERSION } from "@/lib/stateWorkRules";
import StateRulesDisplay from "@/components/grind/parent/StateRulesDisplay";

const TERMS_VERSION = "2026-07";

// Two-step parent onboarding:
//   Step 1: Enter DOB (must be 18+) + teen's invite code → look up teen
//   Step 2: See state rules + 8 itemized consent checkboxes + payment auth → submit
export default function ParentOnboarding({ user, initialCode = "" }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState(initialCode);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [teenInfo, setTeenInfo] = useState(null);

  const [consents, setConsents] = useState({});
  const [stateRulesAck, setStateRulesAck] = useState(false);
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

  const lookup = async () => {
    setError("");
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
        stateRulesAcknowledged: stateRulesAck,
        stateRules: teenInfo?.stateRules,
        userAgent: navigator.userAgent,
      });
      if (!res.data?.linked) {
        setError(res.data?.error || "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      await base44.auth.updateMe({
        app_role: "parent",
        onboarded: true,
        date_of_birth: dob,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        payment_auth_acknowledged_at: new Date().toISOString(),
      });
      localStorage.removeItem("grind_invite_code");
      setSaving(false);
      window.location.href = "/parent";
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(1);
    setTeenInfo(null);
    setConsents({});
    setStateRulesAck(false);
    setError("");
  };

  // Step 1: DOB + invite code
  if (step === 1) {
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
            placeholder="ABCD1234"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
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
        <Button className="w-full rounded-xl" disabled={!code || !dob || lookingUp} onClick={lookup}>
          {lookingUp ? "Looking up..." : "Look up teen & review rules"}
        </Button>
        <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
      </div>
    );
  }

  // Step 2: State rules + 8 consent checkboxes + payment auth
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={reset} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Consent & link</h2>
      </div>

      <div className="bg-blue-50/50 rounded-xl px-3.5 py-2.5 border border-blue-100">
        <p className="text-xs font-bold text-blue-900">
          Linking to: {teenInfo?.teenName}
          {teenInfo?.teenState && ` · ${teenInfo?.teenState}`}
          {teenInfo?.teenAge != null && ` · Age ${teenInfo?.teenAge}`}
        </p>
        {!teenInfo?.ageVerified && (
          <p className="text-[11px] text-amber-600 mt-1">
            ⚠ Age not yet verified — your teen will need to verify their ID before the link is fully confirmed.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" /> State child-labor rules that apply
        </p>
        <StateRulesDisplay stateRules={teenInfo?.stateRules} teenName={teenInfo?.teenName} />
      </div>

      <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer bg-amber-50 border border-amber-200 rounded-xl p-3">
        <Checkbox checked={stateRulesAck} onCheckedChange={setStateRulesAck} className="mt-0.5" />
        <span>
          <strong>I have read and understand the California child-labor rules shown above</strong> for
          my teen's age, including hour limits, prohibited work hours, and category minimums. The casual, irregular odd jobs offered on this platform are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes, as described in the California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). I remain responsible for confirming any requirements applicable to my teen's situation — Blockwork does not determine permit eligibility. Hour limits, age restrictions, and hazardous-occupation rules still apply.
        </span>
      </label>

      <div className="space-y-2.5">
        <p className="text-xs font-bold text-foreground">Parental consent — check each box individually</p>
        {CONSENT_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
            <Checkbox
              checked={consents[item.key] === true}
              onCheckedChange={(checked) => setConsents((prev) => ({ ...prev, [item.key]: checked === true }))}
              className="mt-0.5"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={paymentAuth} onCheckedChange={setPaymentAuth} className="mt-0.5" />
        <span>I authorize Blockwork to process payments on my behalf, including holding funds in escrow and transferring payouts to my connected bank account.</span>
      </label>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        className="w-full rounded-xl"
        disabled={!allConsentsChecked || !stateRulesAck || !paymentAuth || saving}
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