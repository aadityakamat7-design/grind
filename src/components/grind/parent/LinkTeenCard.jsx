import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, UserPlus } from "lucide-react";

// Lets an already-onboarded parent link an additional teen at any time
// (parent identity was already verified during onboarding; the server
// re-checks it on every call, so this reuses the same double-verified flow).
export default function LinkTeenCard({ onLinked }) {
  const [code, setCode] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const link = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("confirmParentLink", {
        inviteCode: code.trim().toUpperCase(),
        attestRelationship: tosAccepted === true,
      });
      if (!res.data?.linked) {
        setError(res.data?.error || "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      setCode("");
      setTosAccepted(false);
      setSaving(false);
      onLinked?.();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <p className="font-bold text-slate-900 flex items-center gap-1.5">
        <UserPlus className="w-4 h-4 text-blue-500" /> Link a student
      </p>
      <p className="text-xs text-slate-500">Enter the parent code your teen generated in their app to connect their account to yours.</p>
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
      <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>I confirm I am this teen's parent or legal guardian and I accept the Terms of Service.</span>
      </label>
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <Button className="w-full rounded-xl" disabled={!code || !tosAccepted || saving} onClick={link}>
        {saving ? "Linking..." : "Link student"}
      </Button>
    </div>
  );
}