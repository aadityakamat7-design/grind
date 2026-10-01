import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Checkbox } from "@/components/ui/checkbox";
import AuthLayout from "@/components/AuthLayout";
import AgeGateStep from "@/components/auth/AgeGateStep";
import SocialButtons from "@/components/auth/SocialButtons";
import LegalModal from "@/components/grind/LegalModal";
import { toast } from "@/components/ui/use-toast";
import { readRoleFromUrl, clearSignupProgress } from "@/lib/signupState";

const ROLE_TITLES = { teen: "teen", parent: "parent", buyer: "neighbor" };

// Sign-up, in three steps:
//   1. age — who you are (role) + date of birth. Checked on the server, before
//      any account exists; it is held for 15 minutes under a one-time token.
//   2. account — Google / Apple / Facebook / email. The token rides along, so the
//      age check survives the trip out to the provider and back.
//   3. OTP — the emailed code (email sign-up only).
// The role and date of birth are never kept on the device: they live on the
// server, and Onboarding re-reads them from the account.
export default function Register() {
  const [stage, setStage] = useState("age"); // age | account | otp
  const [role, setRole] = useState(() => readRoleFromUrl());
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearSignupProgress();
  }, []);

  // Step 1 → the server checks the age for this role and returns the one-time
  // token. Nothing is saved when the check fails.
  const startAgeCheck = async (pickedRole, dob) => {
    try {
      const res = await base44.functions.invoke("startSignup", { role: pickedRole, dateOfBirth: dob });
      if (res.data?.error) {
        clearSignupProgress();
        return { error: res.data.error };
      }
      setToken(res.data.token);
      setRole(pickedRole);
      setStage("account");
      return {};
    } catch (err) {
      const data = err?.response?.data || err?.data || {};
      return { error: data.error || "Something went wrong. Please try again." };
    }
  };

  // Where every sign-up lands: the onboarding steps, carrying the age-check token
  // and any invite / referral code that came in on the link.
  const onboardingDest = () => {
    const params = new URLSearchParams();
    if (token) params.set("st", token);
    const here = new URLSearchParams(window.location.search);
    const code = here.get("code") || localStorage.getItem("grind_invite_code");
    const ref = here.get("ref") || localStorage.getItem("grind_referral");
    if (code) params.set("code", code);
    if (ref) params.set("ref", ref);
    return `/onboarding?${params.toString()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }
    const common = ["password", "12345678", "123456789", "qwerty123", "abc123456", "password123", "iloveyou", "admin123", "welcome1", "letmein1"];
    if (common.includes(password.toLowerCase())) {
      setError("That password is too common. Please choose a stronger one.");
      return;
    }
    setLoading(true);
    try {
      await secureAuth("register", { email, password });
      setStage("otp");
    } catch (err) {
      const msg = err?.message || "";
      if (/too many attempts/i.test(msg)) {
        setError(msg);
      } else if (/exist|already|taken|registered/i.test(msg)) {
        setError("An account with this email already exists — log in instead.");
      } else {
        setError(msg || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      } else {
        await base44.auth.loginViaEmailPassword(email, password);
      }
      // Hard redirect so the new session and the server-side sign-up step are
      // picked up together.
      window.location.href = onboardingDest();
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await secureAuth("resend-otp", { email });
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const footer = (
    <>
      Already have an account?{" "}
      <Link to="/login" className="text-primary font-medium hover:underline">
        Log in
      </Link>
    </>
  );

  if (stage === "age") {
    return (
      <AuthLayout
        icon={UserPlus}
        title={role ? "Your date of birth" : "Join Blockwork"}
        subtitle={role ? "Last check before we set up your account" : "First, tell us who you are"}
        showBackdrop={false}
        footer={footer}
      >
        <AgeGateStep initialRole={role} onSubmit={startAgeCheck} />
      </AuthLayout>
    );
  }

  if (stage === "otp") {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`} showBackdrop={false}>
        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle={`Signing up as a ${ROLE_TITLES[role] || "new member"}`}
      showBackdrop={false}
      footer={footer}
    >
      <button
        onClick={() => {
          setStage("age");
          setRole(null);
          setToken("");
          setError("");
        }}
        className="text-xs font-semibold text-muted-foreground mb-4 hover:text-foreground"
      >
        ← Change role
      </button>

      <SocialButtons
        onProvider={(provider) => base44.auth.loginWithProvider(provider, onboardingDest())}
        browserUrl={window.location.href}
      />

      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              minLength={10}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="agree" checked={agreedToTerms} onCheckedChange={(v) => setAgreedToTerms(!!v)} className="mt-0.5" />
          <Label htmlFor="agree" className="text-xs font-normal text-muted-foreground cursor-pointer leading-relaxed">
            I agree to the{" "}
            <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
          </Label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !agreedToTerms}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </AuthLayout>
  );
}