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

  const isActive = profile?.status === "active";

  if (!profile) {
    return (
      <div className="rounded-2xl p-5 border bg-card border-border shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Setting up your parent code…</p>
            <p className="text-xs mt-1 text-muted-foreground">We're preparing your parent-link code. If this doesn't appear shortly, refresh the page.</p>
          </div>
        </div>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl p-5 border shadow-soft ${isActive ? "bg-card border-border" : "bg-card border-border"}`}>
      <div className="flex items-start gap-3">
        {isActive ? (
          <ShieldCheck className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground">
              {isActive ? "Parent linked" : "Waiting for your parent"}
            </p>
            {isActive && <TrustBadge type="parent_approved" />}
          </div>
          <p className="text-xs mt-1 text-muted-foreground">
            {isActive
              ? "Your account is verified. Keep this code to link another parent or guardian if you ever need to."
              : "Your services can't go live until a parent links to your account with your code:"}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="font-bold tracking-[0.25em] bg-muted rounded-lg px-3 py-1.5 text-sm border border-border text-foreground">
              {code || "…"}
            </span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}