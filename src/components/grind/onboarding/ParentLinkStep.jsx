import React, { useState } from "react";
import { Clock } from "lucide-react";
import ParentLinkFlow from "@/components/grind/onboarding/ParentLinkFlow";
import LinkLaterButton from "@/components/grind/onboarding/LinkLaterButton";

// Parent sign-up, step 3 — link a teen now, or skip and do it later from the
// dashboard ("Add your teen"). Skipping finishes onboarding; the parent still
// gets the approvals dashboard, it just has no teen attached yet.
export default function ParentLinkStep({ user, initialCode = "", onDone }) {
  const [linkedName, setLinkedName] = useState("");

  if (linkedName) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-xl font-bold text-foreground">You're linked!</h2>
        <p className="text-sm text-muted-foreground">
          {linkedName} is now your approved teen. They can post services and take jobs, and you'll approve each one
          before it goes ahead.
        </p>
        <LinkLaterButton label="Go to my dashboard" onDone={onDone} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ParentLinkFlow user={user} initialCode={initialCode} onLinked={(teen) => setLinkedName(teen?.teenName || "Your teen")} />
      <div className="border-t border-border pt-4">
        <button
          onClick={onDone}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-2.5"
        >
          <Clock className="w-4 h-4" /> I'll link my teen later
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-1">
          You can add your teen any time from your dashboard. Your teen can't post services or take jobs until you link.
        </p>
      </div>
    </div>
  );
}