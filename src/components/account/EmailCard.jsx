import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Mail, CheckCircle2 } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";
import RecheckPanel from "@/components/account/RecheckPanel";

const PROVIDER_LABELS = { google: "Google", apple: "Apple", facebook: "Facebook" };

// Email changes are two-step: we email the new address a one-time link, and
// nothing moves until that link is opened. The address being replaced gets a
// notice with a one-tap "this wasn't me".
export default function EmailCard({ data, onSaved }) {
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  const current = data.identity.contact_email || data.identity.signin_email || "";
  const provider = data.identity.auth_method !== "password" ? data.identity.auth_method : null;

  const request = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await callAccountFunction("accountEmail", {
        action: "request",
        new_email: newEmail,
        password: password || undefined,
      });
      setSentTo(res?.sent_to || newEmail);
      setNewEmail("");
      setPassword("");
      setNeedsRecheck(false);
      onSaved?.();
    } catch (err) {
      if (err.code === "recheck_required") setNeedsRecheck(true);
      else if (err.code === "provider_recheck") setNeedsRecheck(true);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (sentTo) {
    return (
      <SectionCard icon={Mail} title="Email">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-xs text-emerald-700 space-y-1">
            <p className="font-semibold">Check your inbox</p>
            <p>
              We sent a confirmation link to <span className="font-semibold">{sentTo}</span>. Your email changes only
              when you open it — and we'll tell your old address once it does.
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full rounded-full" onClick={() => setSentTo("")}>
          Done
        </Button>
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={Mail} title="Email" description="Where Blockwork sends your bookings, receipts and safety notices.">
      <div className="rounded-xl bg-secondary p-3.5 space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Your email</p>
        <p className="text-sm font-semibold text-foreground break-all">{current}</p>
        {provider && (
          <p className="text-[11px] text-muted-foreground">
            You sign in with {PROVIDER_LABELS[provider] || provider}. You can add a password below to sign in with email too.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="new_email">New email address</Label>
        <Input
          id="new_email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="rounded-xl mt-1"
          placeholder="you@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
      </div>

      {needsRecheck && (
        <RecheckPanel
          provider={provider || "password"}
          password={password}
          onPasswordChange={setPassword}
          busy={saving}
          note="Changing your email needs you to confirm it's you."
        />
      )}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button className="w-full rounded-full" disabled={saving || !newEmail} onClick={request}>
        {saving ? "Sending…" : "Send confirmation link"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Your sign-in email is your account ID and can't be edited here — contact support and we'll move your account after verifying it's you.
      </p>
    </SectionCard>
  );
}