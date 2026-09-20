import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import { Checkbox } from "@/components/ui/checkbox";
import VerifyEmailForm from "@/components/VerifyEmailForm";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem("grind_remembered_email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("grind_remembered_email"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await secureAuth("login", { email, password });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      if (rememberMe) {
        localStorage.setItem("grind_remembered_email", email);
      } else {
        localStorage.removeItem("grind_remembered_email");
      }
      window.location.href = safeReturnTo();
    } catch (err) {
      const msg = err?.message || "";
      if (/too many attempts/i.test(msg)) {
        setError(msg);
      } else if (/verif/i.test(msg)) {
        // Account exists but the email was never verified — send a code and finish verification here.
        try { await secureAuth("resend-otp", { email }); } catch { /* code entry still shown */ }
        setNeedsVerification(true);
      } else if (/invalid|incorrect|credential|not found/i.test(msg)) {
        setError("Incorrect email or password. If you don't have an account yet, tap \"Create one\" below.");
      } else {
        setError(
          msg ||
            "We couldn't log you in. Double-check your email and password — or create an account if you don't have one yet."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-start Google sign-in when redirected back with ?google=1 (used by
  // the iframe-blocked fallback link). The SDK handles iframe popup auth.
  useEffect(() => {
    const wantsGoogle = new URLSearchParams(window.location.search).get("google") === "1";
    if (wantsGoogle) {
      base44.auth.loginWithProvider("google", safeReturnTo());
    }
  }, []);

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const handleProvider = (provider) => {
    base44.auth.loginWithProvider(provider, safeReturnTo());
  };

  if (needsVerification) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`Your account isn't verified yet. We sent a code to ${email}`}
      >
        <VerifyEmailForm email={email} password={password} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-3"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          variant="outline"
          className="h-12 text-sm font-medium"
          onClick={() => handleProvider("apple")}
        >
          <AppleIcon className="w-5 h-5 mr-2" />
          Apple
        </Button>
        <Button
          variant="outline"
          className="h-12 text-sm font-medium"
          onClick={() => handleProvider("facebook")}
        >
          <FacebookIcon className="w-5 h-5 mr-2" />
          Facebook
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(!!v)}
          />
          <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
            Remember me on this device
          </Label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}