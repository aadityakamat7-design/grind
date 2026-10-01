import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthMessage from "@/components/entry/AuthMessage";
import BackLink from "@/components/entry/BackLink";
import { NETWORK_MESSAGE } from "@/lib/authErrors";

// "Welcome back" — the password screen for an account that already exists.
// An account whose email was never verified is sent a new code and continues on
// the code screen; it is never told to create an account.
export default function PasswordStep({ email, notice, methodUnknown, onBack, onSignedIn, onNeedsCode }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await secureAuth("login", { email, password });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      onSignedIn("password");
    } catch (err) {
      const msg = err?.message || "";
      if (/too many attempts/i.test(msg)) {
        setError(msg);
      } else if (/verif/i.test(msg)) {
        try { await secureAuth("resend-otp", { email }); } catch { /* the code screen has its own resend */ }
        onNeedsCode(password);
        return;
      } else if (/network|failed to fetch|timeout|load failed/i.test(msg)) {
        setError(NETWORK_MESSAGE);
      } else {
        setError("Wrong password.");
      }
      setLoading(false);
    }
  };

  return (
    <div>
      <BackLink onClick={onBack}>Use a different email</BackLink>
      {notice && <div className="mb-4"><AuthMessage kind="success">{notice}</AuthMessage></div>}
      <p className="text-sm text-foreground mb-4 break-all">
        Signing in as <span className="font-semibold">{email}</span>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="entry-password">Password</Label>
            <Link to={`/forgot-password?email=${encodeURIComponent(email)}`} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="entry-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="pl-10 pr-10 h-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <AuthMessage>{error}</AuthMessage>
        {methodUnknown && (
          <p className="text-xs text-muted-foreground">
            Signed up with Google, Apple or Facebook? Go back and use that button instead.
          </p>
        )}
        <Button type="submit" className="w-full h-12 font-medium" disabled={!password || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}