import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, AlertCircle } from "lucide-react";

export default function ParentOnboarding({ user, initialCode = "" }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const link = async () => {
    setSaving(true);
    setError("");
    const profiles = await base44.entities.TeenProfile.filter({ invite_code: code.trim().toUpperCase() });
    const teen = profiles[0];
    if (!teen) {
      setError("No teen found with that code. Double-check and try again.");
      setSaving(false);
      return;
    }
    await base44.entities.ParentProfile.create({
      user_id: user.id,
      full_name: user.full_name || "",
      connect_status: "not_setup",
    });
    await base44.entities.ParentTeenLink.create({
      parent_user_id: user.id,
      teen_user_id: teen.user_id,
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });
    await base44.entities.TeenProfile.update(teen.id, { status: "active" });
    await base44.auth.updateMe({ app_role: "PARENT", onboarded: true });
    setSaving(false);
    navigate("/parent");
  };

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