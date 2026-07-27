import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

export default function AlertParentButton({ booking }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const alertParent = async () => {
    setSending(true);
    try {
      await base44.functions.invoke("alertParent", { bookingId: booking.id });
      setSent(true);
    } catch {
      // Server function validates the teen is on the booking before notifying
    }
    setSending(false);
  };

  if (sent)
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-700 font-semibold">
        <CheckCircle2 className="w-5 h-5 shrink-0" /> Your parent has been alerted with the job details and your location.
      </div>
    );

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
      <button
        onClick={alertParent}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 transition-colors disabled:opacity-60"
      >
        <ShieldAlert className="w-5 h-5" /> {sending ? "Alerting..." : "Alert my parent"}
      </button>
      <p className="text-[11px] text-rose-600 mt-2 text-center">
        Feel unsafe? One tap instantly sends your parent the job details and your live location.
      </p>
    </div>
  );
}