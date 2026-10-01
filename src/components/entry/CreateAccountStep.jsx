import React, { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import LegalModal from "@/components/grind/LegalModal";
import AuthMessage from "@/components/entry/AuthMessage";
import BackLink from "@/components/entry/BackLink";
import { NETWORK_MESSAGE } from "@/lib/authErrors";

const COMMON = ["password", "12345678", "123456789", "qwerty123", "abc123456", "password123", "iloveyou", "admin123", "welcome1", "letmein1"];

// Sign-up, step 2: choose a password. The email was already typed on the entry
// screen and already checked — it has no account yet.
export default function CreateAccountStep({ email, onBack, onCreated, onExists }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [legal, setLegal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 10) return setError("Password must be at least 10 characters long.");
    if (COMMON.includes(password.toLowerCase())) return setError("That password is too common. Choose a stronger one.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      await secureAuth("register", { email, password });
      onCreated(password);
    } catch (err) {
      const msg = err?.message || "";
      if (/exist|already|taken|registered/i.test(msg)) {
        await onExists(password);
        return;
      }
      setError(/network|failed to fetch|timeout|load failed/i.test(msg) ? NETWORK_MESSAGE : msg || "Couldn't create your account. Try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <BackLink onClick={onBack}>Back</BackLink>
      <p className="text-sm text-foreground mb-4 break-all">
        Creating an account for <span className="font-semibold">{email}</span>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="create-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="create-password" type="password" autoComplete="new-password" autoFocus placeholder="At least 10 characters" className="pl-10 h-12" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="create-confirm" type="password" autoComplete="new-password" className="pl-10 h-12" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="create-agree" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
          <Label htmlFor="create-agree" className="text-xs font-normal text-muted-foreground cursor-pointer leading-relaxed">
            I agree to the{" "}
            <button type="button" onClick={() => setLegal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => setLegal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
          </Label>
        </div>
        <AuthMessage>{error}</AuthMessage>
        <Button type="submit" className="w-full h-12 font-medium" disabled={!password || !confirm || !agreed || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <LegalModal type={legal} open={!!legal} onOpenChange={(v) => !v && setLegal(null)} />
    </div>
  );
}