import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Zap, Sparkles, ShieldCheck, Search, ChevronRight } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import ParentOnboarding from "@/components/grind/onboarding/ParentOnboarding";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";

const ROLE_HOME = { TEEN: "/teen", PARENT: "/parent", BUYER: "/buyer" };

export default function Onboarding() {
  const { user, loading } = useAppUser();
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get("code") || "";
  const [role, setRole] = useState(inviteCode ? "PARENT" : null);

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/" replace />;
  if (user.app_role && user.onboarded)
    return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="max-w-md mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900">Grind</span>
        </div>

        {!role ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-extrabold text-slate-900">Who are you?</h1>
            <p className="text-sm text-slate-500">Pick your role to set up your account.</p>
            {[
              { key: "TEEN", icon: Sparkles, title: "I'm a teen (13–17)", desc: "I want to earn money doing local jobs", cls: "bg-blue-50 text-blue-600" },
              { key: "PARENT", icon: ShieldCheck, title: "I'm a parent", desc: "My teen invited me to approve their account", cls: "bg-emerald-50 text-emerald-600" },
              { key: "BUYER", icon: Search, title: "I'm a neighbor (18+)", desc: "I want to hire trusted local teens", cls: "bg-blue-50 text-blue-600" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className="w-full flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${r.cls}`}>
                  <r.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setRole(null)} className="text-xs font-semibold text-slate-400 mb-4 hover:text-slate-600">
              ← Change role
            </button>
            {role === "TEEN" && <TeenOnboarding user={user} />}
            {role === "PARENT" && <ParentOnboarding user={user} initialCode={inviteCode} />}
            {role === "BUYER" && <BuyerOnboarding user={user} />}
          </div>
        )}
      </div>
    </div>
  );
}