import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthMessage from "@/components/entry/AuthMessage";
import { NETWORK_MESSAGE } from "@/lib/authErrors";

const COMMON = ["password", "12345678", "123456789", "qwerty123", "abc123456", "password123", "iloveyou", "admin123", "welcome1", "letmein1"];

function resetError(err) {
  const msg = err?.message || "";
  if (/too many attempts/i.test(msg)) return msg;
  if (/network|failed to fetch|timeout|load failed/i.test(msg)) return NETWORK_MESSAGE;
  if (/expir|invalid|token/i.test(msg)) return "That reset link expired or was already used. Request a new one.";
  return msg || "Couldn't save your new password. Try again.";
}

// Password reset, step 2: choose a new password. Afterwards the person is signed in
// and sent to /start, which routes them like any other sign-in. If this device
// can't sign them in, they land on the password screen with a "Password updated"
// note instead.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 10) return setError("Password must be at least 10 characters long.");
    if (COMMON.includes(newPassword.toLowerCase())) return setError("That password is too common. Choose a stronger one.");
    if (newPassword !== confirmPassword) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      const result = await secureAuth("reset-password", { resetToken, newPassword });
      let email = result?.user?.email || result?.email || "";
      try { email = email || sessionStorage.getItem("bw_reset_email") || ""; } catch { /* storage unavailable */ }

      let signedIn = false;
      try {
        const login = result?.access_token ? result : email ? await secureAuth("login", { email, password: newPassword }) : null;
        if (login?.access_token) {
          base44.auth.setToken(login.access_token);
          signedIn = true;
        }
      } catch { /* falls through to the password screen */ }

      window.location.href = signedIn
        ? "/start?am=password"
        : `/start?notice=password_updated${email ? `&email=${encodeURIComponent(email)}` : ""}`;
    } catch (err) {
      setError(resetError(err));
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is missing or incomplete."
        footer={<Link to="/forgot-password" className="text-primary font-medium hover:underline">Request a new link</Link>}
      >
        <div className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          The link you used appears to be cut off. Request a new password reset email.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="New password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" autoFocus placeholder="At least 10 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <AuthMessage>{error}</AuthMessage>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            "Save and sign in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}