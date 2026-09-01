import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import RolePicker from "@/components/grind/onboarding/RolePicker";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import ParentOnboarding from "@/components/grind/onboarding/ParentOnboarding";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";
import SiteFooter from "@/components/SiteFooter";

const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

export default function Onboarding() {
  const { user, loading } = useAppUser();
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("code") || "";
  const identityReturn = urlParams.get("identity_return") === "1";
  const [role, setRole] = useState(() => {
    if (inviteCode || identityReturn) return "parent";
    const stored = localStorage.getItem("grind_signup_role");
    return ["teen", "parent", "buyer"].includes(stored) ? stored : null;
  });

  // Clear the stored signup role after mount (not inside the state initializer,
  // which can run twice and lose the role)
  useEffect(() => {
    localStorage.removeItem("grind_signup_role");
  }, []);

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/" replace />;
  if (user.app_role && user.onboarded)
    return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-md mx-auto px-6 py-10 w-full">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center">
            <Zap className="w-4 h-4 text-background" />
          </div>
          <span className="font-bold text-lg text-foreground">Blockwork</span>
        </div>

        {!role ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Who are you?</h1>
            <p className="text-sm text-muted-foreground">Pick your role to set up your account.</p>
            <RolePicker onSelect={setRole} />
          </div>
        ) : (
          <div>
            <button onClick={() => setRole(null)} className="text-xs font-medium text-muted-foreground mb-4 hover:text-foreground">
              ← Change role
            </button>
            {role === "teen" && <TeenOnboarding user={user} />}
            {role === "parent" && <ParentOnboarding user={user} initialCode={inviteCode} />}
            {role === "buyer" && <BuyerOnboarding user={user} />}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}