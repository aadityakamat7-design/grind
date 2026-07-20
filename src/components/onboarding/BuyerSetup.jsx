import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BadgeCheck } from "lucide-react";

export default function BuyerSetup({ user, onDone, onBack }) {
  const [form, setForm] = useState({ full_name: "", address: "", zip: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.full_name || !form.zip) { setError("Name and ZIP code are required."); return; }
    setSaving(true);
    await base44.entities.BuyerProfile.create({
      full_name: form.full_name,
      address: form.address,
      zip: form.zip,
      id_verification_status: "verified",
    });
    onDone();
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-extrabold mb-1">Neighbor setup</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Grind connects you with parent-approved teens near you. Adult ID verification is required before booking.
      </p>
      <div className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Sam Okafor" />
        </div>
        <div>
          <Label>Street address (only shared after a booking is confirmed)</Label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="42 Maple St" />
        </div>
        <div>
          <Label>ZIP code</Label>
          <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} maxLength={5} placeholder="10011" />
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
          <BadgeCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>ID verification:</strong> in production this step runs Stripe Identity / Persona. For this preview your
            account is marked verified automatically.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full rounded-full h-12" onClick={submit} disabled={saving}>
          {saving ? "Verifying…" : "Verify & finish"}
        </Button>
      </div>
    </div>
  );
}