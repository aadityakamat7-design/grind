import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Clock } from "lucide-react";
import ShareInvite from "@/components/grind/ShareInvite";
import LinkLaterButton from "@/components/grind/onboarding/LinkLaterButton";

// Teen sign-up, step 3 — the parent link. The teen shares their connection code
// with a parent or guardian. Nothing can go live until the parent links and
// approves, so this is stated plainly rather than promised as "you're ready".
export default function TeenParentLinkScreen({ user }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profiles = await base44.entities.TeenProfile.filter({ user_id: user.id });
        if (active) setCode(profiles[0]?.invite_code || "");
      } catch {
        /* the code is also shown on the teen dashboard */
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user.id]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-3">Link your parent to start working</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send your code to your parent or guardian. Once they link, you can post services and take jobs — and they
          approve each one before it goes ahead.
        </p>
      </div>

      <div className="bg-muted rounded-2xl p-5 text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your parent code</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-foreground mt-1">
          {loading ? "…" : code || "—"}
        </p>
      </div>
      {code && <ShareInvite code={code} />}

      <div className="border-t border-border pt-4">
        <LinkLaterButton label="Go to my dashboard" onDone={() => "/teen"} />
        <p className="flex items-start justify-center gap-1.5 text-[11px] text-muted-foreground text-center mt-2">
          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Your code is always on your dashboard — share it whenever your parent is ready.
        </p>
      </div>
    </div>
  );
}