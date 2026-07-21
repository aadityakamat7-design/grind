import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function ApprovalQueue({ pending, onDecided }) {
  const [acting, setActing] = useState(null);

  const decide = async (booking, approve) => {
    setActing(booking.id);
    // Approval/denial runs server-side: verifies the parent, refunds via Stripe on deny
    let res;
    try {
      res = await base44.functions.invoke("decideBooking", { bookingId: booking.id, approve });
    } catch (err) {
      alert(err.response?.data?.error || "This booking could not be updated.");
      setActing(null);
      return;
    }
    if (!res.data?.success) {
      alert(res.data?.error || "This booking could not be updated.");
      setActing(null);
      return;
    }
    const verb = approve ? "approved" : "denied";
    await notify(booking.buyer_user_id, { type: "approval", title: `Booking ${verb}`, body: `"${booking.listing_title}" with ${booking.teen_display_name} was ${verb} by their parent.`, link: `/bookings/${booking.id}` });
    await notify(booking.teen_user_id, { type: "approval", title: `Booking ${verb}`, body: `Your parent ${verb} "${booking.listing_title}".`, link: `/bookings/${booking.id}` });
    setActing(null);
    onDecided?.();
  };

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-amber-500" /> Approval queue
      </h2>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400">All clear — nothing is waiting for your approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((b) => (
            <div key={b.id} className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{b.listing_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{b.teen_display_name} · booked by {b.buyer_name}</p>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{money(b.price_total)}</p>
              </div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {b.scheduled_start && (
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(b.scheduled_start), "EEE, MMM d 'at' h:mm a")}
                  </p>
                )}
                {b.address && (
                  <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {b.address}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  disabled={acting === b.id}
                  onClick={() => decide(b, false)}
                >
                  Deny & refund
                </Button>
                <Button size="sm" className="rounded-xl" disabled={acting === b.id} onClick={() => decide(b, true)}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}