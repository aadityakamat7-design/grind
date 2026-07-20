import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

export default function BookingCard({ booking, perspective }) {
  const otherParty =
    perspective === "buyer" ? booking.teen_display_name : booking.buyer_name;
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <CalendarDays className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 truncate">{booking.listing_title}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {perspective === "buyer" ? "with " : "for "}
          {otherParty}
          {booking.scheduled_start && ` · ${format(new Date(booking.scheduled_start), "MMM d, h:mm a")}`}
        </p>
        <div className="mt-1.5">
          <StatusBadge status={booking.status} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-extrabold text-slate-900">{money(booking.price_total)}</p>
        <ChevronRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
      </div>
    </Link>
  );
}