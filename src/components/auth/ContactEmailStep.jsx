import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, AlertCircle } from "lucide-react";

// Facebook (and occasionally Apple) can return an account with no email address.
// The whole product emails people — approvals, payouts, receipts — so we ask for
// one before going any further. Stored on the account by saveContactEmail.
export default function ContactEmailStep({ onSaved }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveContactEmail", { email: email.trim().toLowerCase() });
      if (res.data?.error) {
        setError(res.data.error);
        setSaving(false);
        return;
      }
      setSaving(false);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Add your email address</h2>
      <p className="text-sm text-muted-foreground">
        We need an email to send you approvals, receipts and payout updates.
      </p>
      <div>
        <Label htmlFor="contact-email" className="text-foreground">Email</Label>
        <div className="relative mt-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="pl-10 h-12"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <Button className="w-full h-12 font-medium" disabled={!email.trim() || saving} onClick={save}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
          </>
        ) : (
          "Save and continue"
        )}
      </Button>
    </div>
  );
}