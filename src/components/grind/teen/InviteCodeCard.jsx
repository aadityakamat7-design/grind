import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Copy, Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { genInviteCode } from "@/lib/grind";
import TrustBadge from "@/components/grind/TrustBadge";

// Always-visible card showing the teen's parent-link invite code, with a
// copy button. Self-heals if a profile is missing the code (e.g. created
// before the field existed). Shows a "Verified" badge once a parent has
// confirmed the link.
export default function InviteCodeCard({ profile, onUpdated }) {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState(profile?.invite_code || "");

  useEffect(() => {
    setCode(profile?.invite_code || "");
  }, [profile?.invite_code]);

  useEffect(() => {
    if (profile && !profile.invite_code) {
      const newCode = genInviteCode();
      base44.entities.TeenProfile.update(profile.id, { invite_code: newCode }).then(() => {
        setCode(newCode);
        onUpdated?.();
      });
    }
  }, [profile]);

  if (!profile) return null;
  const isActive = profile.status === "active";

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl p-5 border ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-start gap-3">
        {isActive ? (
          <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`font-bold text-sm ${isActive ? "text-emerald-800" : "text-amber-800"}`}>
              {isActive ? "Parent linked" : "Waiting for your parent"}
            </p>
            {isActive && <TrustBadge type="parent_approved" />}
          </div>
          <p className={`text-xs mt-1 ${isActive ? "text-emerald-700" : "text-amber-700"}`}>
            {isActive
              ? "Your account is verified. Keep this code to link another parent or guardian if you ever need to."
              : "Your services can't go live until a parent links to your account with your code:"}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`font-extrabold tracking-[0.25em] bg-white rounded-lg px-3 py-1.5 text-sm border ${isActive ? "text-emerald-900 border-emerald-200" : "text-amber-900 border-amber-200"}`}>
              {code || "…"}
            </span>
            <button onClick={copyCode} className={isActive ? "text-emerald-700 hover:text-emerald-900" : "text-amber-700 hover:text-amber-900"}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}