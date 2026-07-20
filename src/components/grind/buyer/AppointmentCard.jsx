import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays, MapPin, MessageCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import RescheduleDialog from "@/components/grind/RescheduleDialog";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function AppointmentCard({ booking, onChanged }) {
  const [reschedOpen, setReschedOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const editable = ["pending_parent_approval", "confirmed"].includes(booking.status);
  const addressVisible = ["confirmed", "in_progress"].includes(booking.status);

  const cancel = async () => {
    setActing(true);
    await base44.entities.Booking.update(booking.id, { status: "cancelled", payment_status: "refunded" });
    await notify(booking.teen_user_id, { type: "booking", title: "Booking cancelled", body: `"${booking.listing_title}" was cancelled and the held payment was refunded.`, link: `/bookings/${booking.id}` });
    setActing(false);
    onChanged?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <Link to={`/bookings/${booking.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-900">{booking.listing_title}</p>
            <p className="text-xs text-slate-500 mt-0.5">with {booking.teen_display_name}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={booking.status} />
            <p className="font-extrabold text-slate-900 text-sm mt-1">{money(booking.price_total)}</p>
          </div>
        </div>
        <div className="mt-2.5 space-y-1 text-xs text-slate-600">
          {booking.scheduled_start && (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              {format(new Date(booking.scheduled_start), "EEE, MMM d 'at' h:mm a")}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {addressVisible ? booking.address : "Address revealed after parent approval"}
          </p>
        </div>
      </Link>
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
        <Link to="/messages" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <MessageCircle className="w-3.5 h-3.5" /> Message
        </Link>
        {editable && (
          <>
            <button onClick={() => setReschedOpen(true)} disabled={acting} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Clock className="w-3.5 h-3.5" /> Reschedule
            </button>
            <button onClick={cancel} disabled={acting} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          </>
        )}
      </div>
      {reschedOpen && (
        <RescheduleDialog open={reschedOpen} onOpenChange={setReschedOpen} booking={booking} actorIsBuyer onDone={onChanged} />
      )}
    </div>
  );
}