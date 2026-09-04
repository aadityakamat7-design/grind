import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, UserPlus, CheckCircle2 } from "lucide-react";

// Lets an already-onboarded parent link an additional teen at any time.
// The parent attests the relationship via the invite code + checkbox.
export default function LinkTeenCard({ onLinked }) {
  const [code, setCode] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setCode("");
      setTosAccepted(false);
      setSaving(false);
      onLinked?.();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message || "Something went wrong. Please try again.";
      setError(msg);
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <p className="font-bold text-emerald-700">Account linked!</p>
        <p className="text-xs text-emerald-600">Loading your dashboard…</p>
      </div>
    );
  }

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
          placeholder="ABCD1234"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
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