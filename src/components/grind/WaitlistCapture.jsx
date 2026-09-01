import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function WaitlistCapture({ state, role = "teen" }) {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const join = async () => {
    if (!email || !email.includes("@")) return;
    setSaving(true);
    try {
      await base44.entities.Waitlist.create({ email, state, role });
    } catch {
      // Even if it fails (e.g., duplicate), show success to the user
    }
    setSaved(true);
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>You're on the waitlist! We'll email you when Blockwork launches in your state.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Join the waitlist and we'll let you know when we launch in your state:</p>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl h-10"
        />
        <Button size="sm" className="rounded-xl shrink-0" disabled={!email || !email.includes("@") || saving} onClick={join}>
          {saving ? "..." : "Notify me"}
        </Button>
      </div>
    </div>
  );
}