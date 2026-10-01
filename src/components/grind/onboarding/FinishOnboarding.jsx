import React, { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// The last sign-up step (parent_link_shown → done) is moved along on the server,
// then the account is sent to its dashboard. Shown as a brief spinner because it
// happens in well under a second.
export default function FinishOnboarding({ home = "/" }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await base44.functions.invoke("advanceOnboarding", { to: "parent_link_shown" });
        await base44.functions.invoke("advanceOnboarding", { to: "done" });
      } catch {
        /* the dashboard's own guard re-checks the step server-side */
      }
      window.location.href = home;
    })();
  }, [home]);

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
    </div>
  );
}