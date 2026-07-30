import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { genInviteCode } from "@/lib/grind";
import ShareInvite from "@/components/grind/ShareInvite";

// Shows the teen's parent-link invite code with sharing options.
// When the parent is already linked, collapses to a small subtle badge
// so it's a minor UI detail, not a large block.
export default function InviteCodeCard({ profile, onUpdated }) {
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

  // Already linked — small subtle badge, not a big card
  if (isActive) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-foreground" />
        <span>Parent linked</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="font-mono tracking-wider">{code}</span>
      </div>
    );
  }

  // Not linked yet — full card with sharing options
  return (
    <div className="rounded-2xl p-5 border bg-card border-border shadow-soft">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">Waiting for your parent</p>
          <p className="text-xs mt-1 text-muted-foreground">
            Your services can't go live until a parent links to your account with your code:
          </p>
          <div className="mt-3">
            <span className="font-bold tracking-[0.25em] bg-muted rounded-lg px-3 py-1.5 text-sm border border-border text-foreground">
              {code || "…"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <ShareInvite code={code} />
      </div>
    </div>
  );
}