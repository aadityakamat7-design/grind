import React, { useState } from "react";
import { Link } from "react-router-dom";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthMessage from "@/components/entry/AuthMessage";

// Password reset, step 1: ask for the email. The reset link in the email opens
// /reset-password; after the new password is saved the person is signed in and
// routed like any other sign-in.
export default function ForgotPassword() {
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const value = email.trim().toLowerCase();
    try {
      await secureAuth("reset-request", { email: value });
      // Lets the reset page sign the person straight in on this device afterwards.
      try { sessionStorage.setItem("bw_reset_email", value); } catch { /* storage unavailable */ }
      setSent(true);
    } catch (err) {
      // Whether the email has an account is never revealed — only rate limits are.
      if (/too many attempts/i.test(err?.message || "")) setError(err.message);
      else setSent(true);
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link to="/start" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-success" />
          </div>
          <p className="text-sm text-foreground">
            If <span className="font-semibold break-all">{email}</span> has an account, a reset link is on its way.
          </p>
          <p className="text-xs text-muted-foreground">Check your inbox and spam folder. The link expires in 30 minutes.</p>
          <Button variant="outline" className="w-full h-11" onClick={() => { setSent(false); setEmail(""); }}>
            Try a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <AuthMessage>{error}</AuthMessage>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}