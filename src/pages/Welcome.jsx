import React from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck, BadgeCheck, Wallet, MapPin } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";

const ROLE_HOME = { TEEN: "/teen", PARENT: "/parent", BUYER: "/buyer" };

export default function Welcome() {
  const { user, loading } = useAppUser();

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );

  if (user && user.app_role && user.onboarded)
    return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;
  if (user) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="max-w-md mx-auto px-6 pt-16 pb-12 flex flex-col min-h-screen">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">Grind</span>
        </div>

        <div className="mt-12">
          <h1 className="text-4xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            Local jobs for teens.
            <br />
            <span className="text-blue-600">Parent-approved.</span>
          </h1>
          <p className="text-slate-500 mt-4 text-lg leading-relaxed">
            Teens earn doing what they're good at. Neighbors get trusted help. Parents see everything.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {[
            { icon: ShieldCheck, text: "Every booking approved by a parent", cls: "bg-emerald-50 text-emerald-600" },
            { icon: BadgeCheck, text: "Every neighbor is ID-verified", cls: "bg-blue-50 text-blue-600" },
            { icon: Wallet, text: "Payments held safely until the job is done", cls: "bg-blue-50 text-blue-600" },
            { icon: MapPin, text: "Hyperlocal — your neighborhood only", cls: "bg-amber-50 text-amber-600" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.cls}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10">
          <Button
            className="w-full rounded-xl h-12 text-base font-bold"
            onClick={() => base44.auth.redirectToLogin("/onboarding")}
          >
            Get started
          </Button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Teens 13–17 need a parent to activate their account.
          </p>
        </div>
      </div>
    </div>
  );
}