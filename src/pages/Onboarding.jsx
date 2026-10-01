import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppUser } from "@/lib/useAppUser";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import RolePicker from "@/components/grind/onboarding/RolePicker";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import ParentOnboarding from "@/components/grind/onboarding/ParentOnboarding";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";
import { readRoleFromUrl, clearStoredRole, clearSignupProgress } from "@/lib/signupState";

const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

export default function Onboarding() {
  const { user, loading } = useAppUser();
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("code") || "";
  const refCode = urlParams.get("ref") || "";
  // Persist the invite code so it survives the register/login redirect — an
  // unauthenticated parent clicking the shared link would otherwise lose it
  // when bounced to auth, and arrive at onboarding with an empty code box.
  // Captured once so a later storage clear can't empty the box mid-flow.
  const [pendingCode] = useState(() => inviteCode || localStorage.getItem("grind_invite_code") || "");
  // The role comes ONLY from the picker's explicit choice, which travels in the
  // URL (?role=). It is never inferred from an invite code, a stored value, a
  // previous sign-up on this device, or a default — with no choice made, the
  // picker is shown again.
  const [role, setRole] = useState(() => readRoleFromUrl());

  // Persist the code + referral for the auth redirect, and drop any role residue
  // left by an earlier sign-up on this device.
  useEffect(() => {
    if (inviteCode) localStorage.setItem("grind_invite_code", inviteCode);
    if (refCode) localStorage.setItem("grind_referral", refCode);
    clearStoredRole();
  }, [inviteCode, refCode]);

  // The explicit choice is written into the URL so a refresh keeps it, and any
  // progress belonging to a different role is dropped.
  const chooseRole = (next) => {
    clearSignupProgress();
    setRole(next);
    const params = new URLSearchParams(window.location.search);
    params.set("role", next);
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  // Changing role clears the previous choice and its progress, so nothing can
  // carry over into the new one.
  const changeRole = () => {
    clearSignupProgress();
    setRole(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("role");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };

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
        <RolePicker onSelect={chooseRole} />
      ) : (
        <div>
          <button
            onClick={changeRole}
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