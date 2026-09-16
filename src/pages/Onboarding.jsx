import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppUser } from "@/lib/useAppUser";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import RolePicker from "@/components/grind/onboarding/RolePicker";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import ParentOnboarding from "@/components/grind/onboarding/ParentOnboarding";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";

const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

export default function Onboarding() {
  const { user, loading } = useAppUser();
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("code") || "";
  const identityReturn = urlParams.get("identity_return") === "1";
  const refCode = urlParams.get("ref") || "";
  // Persist the invite code so it survives the register/login redirect — an
  // unauthenticated parent clicking the shared link would otherwise lose it
  // when bounced to auth, and arrive at onboarding with an empty code box.
  const pendingCode = inviteCode || localStorage.getItem("grind_invite_code") || "";
  const [role, setRole] = useState(() => {
    if (pendingCode || identityReturn) return "parent";
    const stored = localStorage.getItem("grind_signup_role");
    return ["teen", "parent", "buyer"].includes(stored) ? stored : null;
  });

  // Persist the code for the auth redirect, then clear the stored signup role.
  useEffect(() => {
    if (inviteCode) localStorage.setItem("grind_invite_code", inviteCode);
    if (refCode) localStorage.setItem("grind_referral", refCode);
    localStorage.removeItem("grind_signup_role");
  }, [inviteCode, refCode]);

  // Record a referral when the user completes onboarding after signing up
  // via someone's invite link. Fire-and-forget — the backend processes it
  // even after the redirect navigates away.
  useEffect(() => {
    const ref = localStorage.getItem("grind_referral");
    if (user?.onboarded && ref && user?.id !== ref) {
      base44.functions.invoke("trackReferral", { referrerId: ref, referredEmail: user.email })
        .catch(() => {})
        .finally(() => localStorage.removeItem("grind_referral"));
    }
  }, [user?.onboarded, user?.id, user?.email]);

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  if (!user) {
    // Carry the invite code + referral code forward through sign-up.
    const params = new URLSearchParams();
    if (pendingCode) params.set("code", pendingCode);
    if (refCode) params.set("ref", refCode);
    if (params.toString()) {
      const returnTo = `/onboarding?${params.toString()}`;
      return <Navigate to={`/register?returnTo=${encodeURIComponent(returnTo)}`} replace />;
    }
    return <Navigate to="/" replace />;
  }
  if (user.app_role && user.onboarded)
    return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;

  const title = !role ? "Who are you?" : "Set up your account";
  const subtitle = !role
    ? "Pick your role to get started."
    : "Tell us a bit about yourself to get started.";

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {!role ? (
        <RolePicker onSelect={setRole} />
      ) : (
        <div>
          <button
            onClick={() => setRole(null)}
            className="text-xs font-medium text-muted-foreground mb-4 hover:text-foreground"
          >
            ← Change role
          </button>
          {role === "teen" && <TeenOnboarding user={user} />}
          {role === "parent" && <ParentOnboarding user={user} initialCode={pendingCode} />}
          {role === "buyer" && <BuyerOnboarding user={user} />}
        </div>
      )}
    </AuthLayout>
  );
}