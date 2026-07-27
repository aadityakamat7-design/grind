import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle } from "lucide-react";

// Linking to a teen is the one thing that must work every time, so onboarding
// leads with it. Identity verification and bank payouts are handled later,
// from the Payouts page, and never block the parent-teen connection itself.
export default function ParentOnboarding({ user, initialCode = "" }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

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
    await base44.auth.updateMe({       app_role: "parent", onboarded: true });
    setSaving(false);
    // Hard redirect so the freshly-set role is picked up
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
        <span>I confirm I am this teen's parent or legal guardian and I accept the Terms of Service.</span>
      </label>
      <Button className="w-full rounded-xl" disabled={!code || !tosAccepted || saving} onClick={link}>
        {saving ? "Linking..." : "Confirm & approve my teen"}
      </Button>
    </div>
  );
}