import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { secureAuth } from "@/lib/secureAuth";
import AuthLayout from "@/components/AuthLayout";
import AgeGateStep from "@/components/auth/AgeGateStep";
import EmailStep from "@/components/entry/EmailStep";
import PasswordStep from "@/components/entry/PasswordStep";
import ProviderNotice from "@/components/entry/ProviderNotice";
import CreateAccountStep from "@/components/entry/CreateAccountStep";
import OtpStep from "@/components/entry/OtpStep";
import { apiError } from "@/lib/authErrors";
import { startUrl } from "@/lib/entryRoute";
import { PROVIDER_LABELS } from "@/lib/authProviders";

const SOCIAL = ["google", "apple", "facebook"];

// The signed-out half of /start. One flow for everyone:
//
//   email ─┬─ new account ───▶ age (role + date of birth) ▶ create password ▶ code ─┐
//          ├─ account exists ▶ password ("Welcome back") ────────────────────────────┤▶ /start (signed in)
//          └─ used Google etc ▶ "This email uses Google sign-in" ▶ provider ──────────┘
//
// Google / Apple / Facebook on the first screen go straight to the provider.
// Every path ends by reloading /start signed in; the signed-in half decides where
// the person goes (see SetupFlow).
export default function EntryFlow({ params }) {
  const resumePassword = params.notice === "password_updated" && !!params.email;
  const [stage, setStage] = useState(resumePassword ? "password" : "email");
  const [email, setEmail] = useState(params.email || "");
  const [method, setMethod] = useState("unknown");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");

  const handOff = (am, tok = token) => {
    window.location.href = startUrl({ token: tok, am, dest: params.dest, code: params.code, role: params.role, ref: params.ref });
  };

  const onChecked = (value, result) => {
    setEmail(value);
    if (result?.status !== "existing") return setStage("age");
    setMethod(result.method || "unknown");
    setStage(SOCIAL.includes(result.method) ? "provider" : "password");
  };

  // Sign-up step 1: the server checks the age rules and holds the result (and any
  // invite code / destination) under a one-time token.
  const checkAge = async (role, dob) => {
    try {
      const res = await base44.functions.invoke("startSignup", { role, dateOfBirth: dob, code: params.code, dest: params.dest });
      setToken(res.data.token);
      setStage("create");
      return {};
    } catch (err) {
      return { error: apiError(err, "Couldn't check your date of birth. Try again in a moment.") };
    }
  };

  // The create screen found the email already registered (typed again after
  // going back from the code screen): if it's an unverified account, resume the code.
  const onExists = async (pw) => {
    setPassword(pw);
    try {
      await secureAuth("login", { email, password: pw });
      handOff("password");
    } catch (err) {
      if (/verif/i.test(err?.message || "")) {
        try { await secureAuth("resend-otp", { email }); } catch { /* the code screen has resend */ }
        return setStage("otp");
      }
      setMethod("unknown");
      setStage("password");
    }
  };

  const titles = {
    email: ["Continue to Blockwork", params.code ? "Sign in or create your parent account to link with your teen." : "Sign in or create your account."],
    password: ["Welcome back", "Enter your password to sign in."],
    provider: [`This email uses ${PROVIDER_LABELS[method] || "social"} sign-in`, "Use the same sign-in to get back in."],
    age: ["Create your account", "First, a quick age check so we set up the right account."],
    create: ["Create your password", "You'll confirm your email next."],
    otp: ["Check your email", "Enter the code we sent you."],
  };
  const [title, subtitle] = titles[stage];

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {stage === "email" && <EmailStep email={email} setEmail={setEmail} params={params} onChecked={onChecked} />}
      {stage === "password" && (
        <PasswordStep
          email={email}
          notice={resumePassword && stage === "password" ? "Password updated. Sign in with your new password." : ""}
          methodUnknown={method === "unknown"}
          onBack={() => setStage("email")}
          onSignedIn={handOff}
          onNeedsCode={(pw) => {
            setPassword(pw);
            setStage("otp");
          }}
        />
      )}
      {stage === "provider" && <ProviderNotice email={email} provider={method} params={params} onBack={() => setStage("email")} />}
      {stage === "age" && (
        <AgeGateStep
          initialRole={params.role || null}
          lockRole={params.roleLocked}
          onBack={() => setStage("email")}
          onSubmit={checkAge}
        />
      )}
      {stage === "create" && (
        <CreateAccountStep
          email={email}
          onBack={() => setStage("age")}
          onCreated={(pw) => {
            setPassword(pw);
            setStage("otp");
          }}
          onExists={onExists}
        />
      )}
      {stage === "otp" && (
        <OtpStep email={email} password={password} onBack={() => setStage(token ? "create" : "password")} onVerified={handOff} />
      )}
    </AuthLayout>
  );
}