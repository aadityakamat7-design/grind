import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthMessage from "@/components/entry/AuthMessage";
import BackLink from "@/components/entry/BackLink";
import { NETWORK_MESSAGE } from "@/lib/authErrors";

function otpMessage(err) {
  const msg = err?.message || "";
  if (/expir/i.test(msg)) return "That code expired, send a new one.";
  if (/network|failed to fetch|timeout|load failed/i.test(msg)) return NETWORK_MESSAGE;
  return "That code isn't right. Check the 6 digits and try again.";
}

// The emailed 6-digit code. Verifying signs the person in, then the flow hands off
// to the routing step.
export default function OtpStep({ email, password, onBack, onVerified }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode: code });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      else if (password) await base44.auth.loginViaEmailPassword(email, password);
      onVerified("password");
    } catch (err) {
      setError(otpMessage(err));
      setCode("");
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setSent(false);
    try {
      await secureAuth("resend-otp", { email });
      setSent(true);
    } catch (err) {
      setError(/too many attempts/i.test(err?.message || "") ? err.message : "Couldn't send a new code. Try again in a minute.");
    }
  };

  return (
    <div>
      <BackLink onClick={onBack}>Back</BackLink>
      <p className="text-sm text-foreground mb-5 break-all">
        We sent a 6-digit code to <span className="font-semibold">{email}</span>.
      </p>
      <div className="flex justify-center mb-5">
        <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus autoComplete="one-time-code">
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="space-y-3">
        <AuthMessage>{error}</AuthMessage>
        <AuthMessage kind="success">{sent ? "A new code is on its way." : ""}</AuthMessage>
        <Button className="w-full h-12 font-medium" onClick={verify} disabled={loading || code.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Didn't get it?{" "}
        <button type="button" onClick={resend} className="text-primary font-medium hover:underline">
          Send a new code
        </button>
      </p>
    </div>
  );
}