import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { KeyRound, MailCheck } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";
import RecheckPanel from "@/components/account/RecheckPanel";

// Password changes. Accounts with a password confirm the current one; accounts
// that only use Google / Apple / Facebook add a password through an emailed
// link, so the platform's own reset stays the single place a password is set.
export default function PasswordCard({ data }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [linkSent, setLinkSent] = useState("");

  const hasPassword = !!data.identity.has_password;
  const provider = data.identity.auth_method;

  const change = async () => {
    setError("");
    if (next !== confirm) { setError("The two new passwords don't match."); return; }
    setSaving(true);
    try {
      await callAccountFunction("accountPassword", { current_password: current, new_password: next });
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
      toast({ title: "Password changed", description: "We emailed you a notice — tap it if this wasn't you." });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const requestLink = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await callAccountFunction("accountPassword", { action: "request_set_link" });
      setLinkSent(res?.message || "Check your email for a link to set a password.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasPassword) {
    return (
      <SectionCard icon={KeyRound} title="Password" description="Your account signs in with Google, Apple or Facebook.">
        {linkSent ? (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
            <MailCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700">{linkSent}</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-foreground">
              Add a password to sign in with your email as well. We'll email you a link.
            </p>
            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            <Button className="w-full rounded-full" disabled={saving} onClick={requestLink}>
              {saving ? "Sending…" : "Add a password"}
            </Button>
          </>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={KeyRound} title="Password" description="Changing your password needs the current one.">
      {done && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
          <MailCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700">
            Your password is updated. We emailed you a notice — if it wasn't you, tap "this wasn't me" in that email.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="cur_pw">Current password</Label>
        <Input id="cur_pw" type="password" autoComplete="current-password" className="rounded-xl mt-1" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="new_pw">New password</Label>
        <Input id="new_pw" type="password" autoComplete="new-password" className="rounded-xl mt-1" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="new_pw2">Confirm new password</Label>
        <Input id="new_pw2" type="password" autoComplete="new-password" className="rounded-xl mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      {!error && !current && (
        <RecheckPanel
          provider="password"
          password={current}
          onPasswordChange={setCurrent}
          busy={saving}
          note="For your safety, confirm your password if it has been more than 15 minutes since you signed in."
        />
      )}

      <Button className="w-full rounded-full" disabled={saving || !current || !next} onClick={change}>
        {saving ? "Saving…" : "Change password"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        After a change, other devices may need to sign in again with the new password.
      </p>
      {provider && provider !== "password" && (
        <p className="text-[11px] text-muted-foreground">You can also keep signing in with {provider}.</p>
      )}
    </SectionCard>
  );
}