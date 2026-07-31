import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";

// Button shown on a pending approval when the teen hasn't verified their
// identity yet. Lets the parent send a reminder notification to the teen.
export default function NudgeVerifyButton({ bookingId, teenName }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("nudgeTeenVerify", { bookingId });
      if (res.data?.success) {
        setSent(true);
      } else {
        alert(res.data?.error || "Could not send reminder. Please try again.");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Could not send reminder. Please try again.");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
        <CheckCircle2 className="w-3.5 h-3.5" /> Reminder sent to {teenName?.split(" ")[0] || "your teen"}!
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl mt-2 w-full"
      disabled={sending}
      onClick={send}
    >
      <Bell className="w-3.5 h-3.5" />
      {sending ? "Sending…" : `Remind ${teenName?.split(" ")[0] || "teen"} to verify`}
    </Button>
  );
}