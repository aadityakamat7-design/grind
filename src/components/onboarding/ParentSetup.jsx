import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ParentSetup({ user, onDone, onBack }) {
  const [form, setForm] = useState({ full_name: "", phone: "", code: "", relationship: "Parent" });
  const [tos, setTos] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.full_name) { setError("Please enter your full name."); return; }
    if (!tos) { setError("You must accept the Terms of Service — you are the legal and financial account holder."); return; }
    setSaving(true);

    let teen = null;
    if (form.code) {
      const matches = await base44.entities.TeenProfile.filter({ invite_code: form.code.trim().toUpperCase() });
      teen = matches[0];
      if (!teen) {
        setError("That invite code didn't match any teen. Double-check it, or skip and link later.");
        setSaving(false);
        return;
      }
    }

    await base44.entities.ParentProfile.create({
      full_name: form.full_name,
      phone: form.phone,
      tos_accepted: true,
      connect_status: "verified",
    });

    if (teen) {
      await base44.entities.ParentTeenLink.create({
        parent_user_id: user.id,
        teen_user_id: teen.created_by_id,
        teen_display_name: teen.display_name,
        relationship: form.relationship,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      });
      await base44.entities.TeenProfile.update(teen.id, { status: "active" });
      await base44.entities.Notification.create({
        user_id: teen.created_by_id,
        title: "Your parent approved you! 🎉",
        body: `${form.full_name} linked to your account. You can now publish listings and take bookings.`,
        type: "app",
      });
    }
    onDone();
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-extrabold mb-1">Parent / guardian setup</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        You'll be the legal and financial account holder. Every booking your teen takes requires your approval.
      </p>
      <div className="space-y-4">
        <div>
          <Label>Your full name</Label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Jordan Rivera" />
        </div>
        <div>
          <Label>Phone (optional)</Label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div>
          <Label>Teen's invite code (optional — link later from your dashboard)</Label>
          <Input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="e.g. K7X2ZP"
            className="tracking-widest font-mono"
          />
        </div>
        <div className="bg-secondary rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-secondary-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-secondary-foreground">
            Payouts for your teen's completed jobs go to <strong>your</strong> account. Grind never pays a minor directly.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={tos} onCheckedChange={setTos} className="mt-0.5" />
          <span className="text-sm">
            I confirm I am this teen's parent or legal guardian, and I accept the Terms of Service as the legal and financial account holder.
          </span>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full rounded-full h-12" onClick={submit} disabled={saving}>
          {saving ? "Setting up…" : "Finish setup"}
        </Button>
      </div>
    </div>
  );
}