import React, { useState } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { notify } from "@/lib/notify";

export default function AlertParentButton({ booking }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const alertParent = async () => {
    setSending(true);
    await notify(booking.parent_user_id, {
      type: "safety",
      title: `🚨 Safety alert from ${booking.teen_display_name}`,
      body: `${booking.teen_display_name} tapped the safety button during "${booking.listing_title}" at ${booking.address}. Their current live location has been shared with you — please check in now.`,
      link: `/bookings/${booking.id}`,
    });
    setSending(false);
    setSent(true);
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