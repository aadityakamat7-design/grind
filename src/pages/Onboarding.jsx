import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAppUser } from "@/lib/useAppUser";
import AuthLayout from "@/components/AuthLayout";
import AgeGateStep from "@/components/auth/AgeGateStep";
import ContactEmailStep from "@/components/auth/ContactEmailStep";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import TeenParentLinkScreen from "@/components/grind/onboarding/TeenParentLinkScreen";
import ParentProfileStep from "@/components/grind/onboarding/ParentProfileStep";
import ParentLinkStep from "@/components/grind/onboarding/ParentLinkStep";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";
import FinishOnboarding from "@/components/grind/onboarding/FinishOnboarding";

const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

// Sign-up steps, in order. Every step is decided by the SERVER — the role, the
// date of birth and how far along the account is live on the account record, so
// this page can only ever show the next step, never skip one:
//
//   (no age check)    → age check (role + date of birth)
//   account_created   → profile (teen / parent / neighbor)
//   profile_complete  → parent link (teens under 18 and parents; can be skipped)
//   parent_link_shown → done, then the right dashboard
export default function Onboarding() {
  const { user, loading, reload } = useAppUser();
  const urlParams = new URLSearchParams(window.location.search);
  const st = urlParams.get("st") || "";
  const inviteCode = urlParams.get("code") || "";
  const refCode = urlParams.get("ref") || "";

  // Captured once so a later storage clear can't empty the code box mid-flow.
  const [pendingCode] = useState(() => inviteCode || localStorage.getItem("grind_invite_code") || "");
  const [notice, setNotice] = useState("");
  const [needsAge, setNeedsAge] = useState(!st);
  // Set the moment the server accepts the age check, so the age screen can't
  // flash again while the account is being re-read.
  const [claimed, setClaimed] = useState(false);
  const claimStarted = useRef(false);

  // Carry the invite + referral codes across the auth redirects the person may
  // still be bounced through.
  useEffect(() => {
    if (inviteCode) localStorage.setItem("grind_invite_code", inviteCode);
    if (refCode) localStorage.setItem("grind_referral", refCode);
  }, [inviteCode, refCode]);

  // Record a referral once onboarding is finished. Fire-and-forget.
  useEffect(() => {
    const ref = localStorage.getItem("grind_referral");
    if (user?.onboarded && ref && user?.id !== ref) {
      base44.functions.invoke("trackReferral", { referrerId: ref, referredEmail: user.email })
        .catch(() => {})
        .finally(() => localStorage.removeItem("grind_referral"));
    }
  }, [user?.onboarded, user?.id, user?.email]);

  // Attach the age check that was done before sign-in. The token rides in the URL
  // (?st=…) through Google / Apple / Facebook; if it expired or is missing, the
  // person confirms their role and date of birth again on the age screen.
  useEffect(() => {
    if (loading || !user || claimStarted.current) return;
    if (user.signup_claimed_at) {
      claimStarted.current = true;
      return;
    }
    if (!st) {
      setNeedsAge(true);
      return;
    }
    claimStarted.current = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("claimSignup", { token: st });
        if (res.data?.error) {
          setNotice(res.data.error);
          setNeedsAge(true);
        } else {
          setNeedsAge(false);
          setClaimed(true);
        }
      } catch (err) {
        const data = err?.response?.data || err?.data || {};
        setNotice(data.error || "We couldn't finish setting up your account. Please confirm your details.");
        setNeedsAge(true);
      }
      // Drop the used token from the address bar so a refresh can't retry it.
      const params = new URLSearchParams(window.location.search);
      params.delete("st");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
      await reload();
    })();
  }, [loading, user?.id, user?.signup_claimed_at, st, reload]);

  // Role + date of birth typed here (no token) — the server re-checks the rules.
  const claim = async (role, dob) => {
    try {
      const res = await base44.functions.invoke("claimSignup", { role, dateOfBirth: dob });
      if (res.data?.error) return { error: res.data.error };
      setNotice("");
      setNeedsAge(false);
      setClaimed(true);
      await reload();
      return {};
    } catch (err) {
      const data = err?.response?.data || err?.data || {};
      return { error: data.error || "Something went wrong. Please try again." };
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );

  if (!user) {
    // Carry the invite + referral codes forward through sign-up.
    const params = new URLSearchParams();
    if (pendingCode) params.set("code", pendingCode);
    if (refCode) params.set("ref", refCode);
    const qs = params.toString();
    const returnTo = qs ? `/onboarding?${qs}` : "/onboarding";
    return <Navigate to={`/register?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  // Finished account → its dashboard.
  if (user.app_role && user.onboarded) return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;

  // A social sign-up that came back without an email address (Facebook) can't
  // receive approvals, receipts or payout notices — ask for one first.
  if (!user.email && !user.contact_email) {
    return (
      <AuthLayout title="One more thing" subtitle="We need an email address to keep you posted.">
        <ContactEmailStep onSaved={reload} />
      </AuthLayout>
    );
  }

  // Step 1 — the age check.
  const awaitingClaim = !!st && !user.signup_claimed_at && !needsAge && !claimed;
  if (needsAge || (!user.signup_claimed_at && !claimed)) {
    return (
      <AuthLayout
        title="Set up your account"
        subtitle="Your role and age set up the right account."
        showBackdrop={false}
      >
        {awaitingClaim ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Setting up your account…</p>
          </div>
        ) : (
          <AgeGateStep onSubmit={claim} notice={notice} />
        )}
      </AuthLayout>
    );
  }

  const role = String(user.signup_role || user.app_role || "").toLowerCase();
  const step = user.onboarding_step || "";

  // Step 2 — the profile.
  if (step === "account_created") {
    return (
      <AuthLayout title="Set up your account" subtitle="Tell us a bit about yourself to get started." showBackdrop={false}>
        {role === "teen" && <TeenOnboarding user={user} onProfileSaved={reload} />}
        {role === "parent" && <ParentProfileStep user={user} onSaved={reload} />}
        {role === "buyer" && <BuyerOnboarding user={user} onProfileSaved={reload} />}
      </AuthLayout>
    );
  }

  // Step 3 — the parent link (teens under 18 and parents). It can be skipped;
  // the teen keeps their code on the dashboard and the parent can add a teen
  // later from theirs.
  if (step === "profile_complete") {
    return (
      <AuthLayout
        title={role === "parent" ? "Link your teen" : "Link your parent"}
        subtitle={role === "parent" ? "Approve what your teen does — you can also do this later." : "Nothing goes live until your parent links."}
        showBackdrop={false}
      >
        {role === "parent" ? (
          <ParentLinkStep user={user} initialCode={pendingCode} onDone={() => ROLE_HOME.parent} />
        ) : (
          <TeenParentLinkScreen user={user} />
        )}
      </AuthLayout>
    );
  }

  if (step === "parent_link_shown" || step === "done") {
    return (
      <AuthLayout title="Almost there" subtitle="Finishing your account…" showBackdrop={false}>
        <FinishOnboarding home={ROLE_HOME[role] || "/"} />
      </AuthLayout>
    );
  }

  return <Navigate to={ROLE_HOME[role] || "/"} replace />;
}