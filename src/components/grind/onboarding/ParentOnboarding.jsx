import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Landmark, Loader2, CheckCircle2 } from "lucide-react";
import { calcAge } from "@/lib/grind";
import LegalModal from "@/components/grind/LegalModal";
import { CONSENT_ITEMS, CONSENT_VERSION, FULL_TERMS_TEXT } from "@/lib/stateWorkRules";
import StateRulesDisplay from "@/components/grind/parent/StateRulesDisplay";
import StripeBadge from "@/components/StripeBadge";

const TERMS_VERSION = "2026-07";

// Three-step parent onboarding:
//   Step 1: Enter parent DOB (must be 18+) + teen's invite code → look up teen
//   Step 2: Complete Stripe Connect Express onboarding (legal name, DOB, SSN,
//           bank account, 18+) — required BEFORE the link can be confirmed.
//           The teen's account stays inactive until this is done.
//   Step 3: See state rules + consent checkboxes + enter teen's date of birth
//           → submit. The teen DOB becomes the source of truth for all age rules.
//
// The server re-checks the Connect account status in confirmParentLink, so a
// browser can never bypass the Connect requirement.
export default function ParentOnboarding({ user, initialCode = "" }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(user.full_name && !user.full_name.includes("@") ? user.full_name : "");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [teenInfo, setTeenInfo] = useState(null);
  const [connectStatus, setConnectStatus] = useState("not_setup"); // not_setup | pending | active | restricted
  const [connectChecking, setConnectChecking] = useState(false);
  const [connectStarting, setConnectStarting] = useState(false);

  const [teenDob, setTeenDob] = useState("");
  const [consents, setConsents] = useState({});
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
      if (!profiles[0]) {
        await base44.entities.ParentProfile.create({ user_id: user.id, full_name: name.trim() });
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
      const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
      if (profiles[0] && profiles[0].full_name !== name.trim()) {
        await base44.entities.ParentProfile.update(profiles[0].id, { full_name: name.trim(), dob });
      } else if (profiles[0]) {
        await base44.entities.ParentProfile.update(profiles[0].id, { dob });
      }
      const res = await base44.functions.invoke("lookupTeenByCode", { code: code.trim().toUpperCase() });
      const data = res.data;
      if (data?.error) {
        setError(data.error);
        setLookingUp(false);
        return;
      }
      setTeenInfo(data);
      // Check if the parent already has an active Connect account
      const connectRes = await base44.functions.invoke("checkConnectStatus", {});
      const cs = connectRes.data?.status || "not_setup";
      setConnectStatus(cs);
      setStep(2);
      setLookingUp(false);
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.");
      setLookingUp(false);
    }
  };

  const startConnect = async () => {
    setConnectStarting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("createConnectOnboarding", {
        returnPath: "/onboarding",
        origin: window.location.origin,
      });
      if (!res.data?.url) {
        setError(res.data?.error || "Could not start payout setup. Please try again.");
        setConnectStarting(false);
        return;
      }
      if (window.self !== window.top) {
        alert("Payout setup runs on Stripe's secure page and only works from the published app. Open the app in its own tab.");
        setConnectStarting(false);
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || "Could not start payout setup. Please try again.");
      setConnectStarting(false);
    }
  };

  const checkConnect = useCallback(async () => {
    setConnectChecking(true);
    setError("");
    try {
      const res = await base44.functions.invoke("checkConnectStatus", {});
      const s = res.data?.status || "not_setup";
      setConnectStatus(s);
      if (s === "active") {
        setStep(3);
      } else if (s === "not_setup") {
        setError("It looks like the payout setup wasn't completed. Please finish it to continue.");
      } else if (s === "restricted") {
        setError("Your payout account still needs a few more details. Please finish the setup to continue.");
      } else {
        setError("Stripe is still confirming your details — this usually takes a few minutes. Try again in a moment.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't confirm your payout setup.");
    }
    setConnectChecking(false);
  }, []);

  // Handle redirect return from Stripe Connect onboarding
  useEffect(() => {
    if (step !== 2) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect")) {
      window.history.replaceState({}, "", window.location.pathname);
      checkConnect();
    }
  }, [step, checkConnect]);

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
          You're now set up as your teen's approved parent. You'll approve every booking and manage their payouts.
        </p>
        <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/parent"; }}>
          Go to dashboard
        </Button>
      </div>
    );

  // Step 1: DOB + invite code
  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Link to your teen</h2>
        <p className="text-sm text-muted-foreground">
          Enter your teen's connection code to confirm your relationship and become their approved parent or guardian.
        </p>
        <div>
          <Label className="text-foreground">Your name</Label>
          <Input className="rounded-xl mt-1" placeholder="e.g. Alex Rivera" value={name} onChange={(e) => setName(e.target.value)} />
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
        <Button className="w-full rounded-xl" disabled={!name.trim() || !code || !dob || lookingUp} onClick={lookup}>
          {lookingUp ? "Looking up..." : "Look up teen & review rules"}
        </Button>
        <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
      </div>
    );
  }

  // Step 2: Stripe Connect onboarding (required before link confirmation)
  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={reset} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Verify your payout account</h2>
        </div>

        <div className="bg-blue-50/50 rounded-xl px-3.5 py-2.5 border border-blue-100">
          <p className="text-xs font-bold text-blue-900">
            Linking to: {teenInfo?.teenName}
            {teenInfo?.teenState && ` · ${teenInfo?.teenState}`}
            {teenInfo?.teenAge != null && ` · Age ${teenInfo?.teenAge}`}
          </p>
        </div>

        <div className="bg-secondary border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-background" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Set up payouts with Stripe</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Before you can confirm your teen, Stripe needs to verify you're a real adult (18+). You'll enter your legal name, date of birth, the last 4 of your SSN, and your bank account directly with Stripe — we never see or store those details.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This replaces separate ID verification. Stripe confirms you're a real adult; you confirm you're this teen's parent.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {connectStatus === "active" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-foreground">Your payout account is ready!</p>
            <Button className="w-full rounded-xl" onClick={() => setStep(3)}>
              Continue to consent
            </Button>
          </div>
        ) : connectChecking || connectStarting ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {connectStarting ? "Opening Stripe's secure setup…" : "Confirming your payout setup…"}
            </p>
          </div>
        ) : (
          <>
            <Button className="w-full rounded-xl" onClick={startConnect}>
              {connectStatus === "pending" || connectStatus === "restricted" ? "Continue on Stripe" : "Set up payouts with Stripe"}
            </Button>
            {connectStatus !== "not_setup" && (
              <Button variant="outline" className="w-full rounded-xl" onClick={checkConnect}>
                Check setup status
              </Button>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Required before you can confirm your teen or approve any bookings.
            </p>
          </>
        )}
        <div className="flex justify-center pt-2">
          <StripeBadge />
        </div>
        <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
      </div>
    );
  }

  // Step 3: State rules + consent checkboxes + teen DOB entry
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setStep(2)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
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
      </div>

      <div>
        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> California child-labor rules
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