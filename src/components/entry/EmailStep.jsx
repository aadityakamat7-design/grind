import React, { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/auth/SocialButtons";
import AuthMessage from "@/components/entry/AuthMessage";
import useProviderSignIn from "@/components/entry/useProviderSignIn";
import { apiError } from "@/lib/authErrors";

// The entry screen: Google / Apple / Facebook, or an email. The server answers
// "does this email have an account?" and the flow continues from that — the
// password screen for an existing account, the sign-up steps for a new one.
export default function EmailStep({ email, setEmail, params, onChecked }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const social = useProviderSignIn(params);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError("Enter a valid email address, like you@example.com.");
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("checkEmail", { email: value });
      onChecked(value, res.data);
    } catch (err) {
      setError(apiError(err, "Couldn't check that email. Try again in a moment."));
      setLoading(false);
    }
  };

  return (
    <div>
      <SocialButtons onProvider={social.start} browserUrl={window.location.href} disabled={social.busy} />
      <div className="space-y-4">
        <AuthMessage>{social.error}</AuthMessage>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="entry-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="entry-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="pl-10 h-12"
              />
            </div>
          </div>
          <AuthMessage>{error}</AuthMessage>
          <Button type="submit" className="w-full h-12 font-medium" disabled={!email.trim() || loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}