import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

export default function BookingCard({ booking, perspective }) {
  const navigate = useNavigate();
  const otherParty =
    perspective === "buyer" ? booking.teen_display_name : booking.buyer_name;
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <CalendarDays className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{booking.listing_title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {perspective === "buyer" ? "with " : "for "}
          {perspective === "teen" ? (
            <button
              type="button"
              className="font-medium text-foreground hover:underline"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/neighbors/${booking.buyer_user_id}`); }}
            >
              {otherParty}
            </button>
          ) : otherParty}
          {booking.scheduled_start && ` · ${format(new Date(booking.scheduled_start), "MMM d, h:mm a")}`}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={booking.status} />
          {booking.is_recurring && (
            <span className="inline-flex items-center rounded-full border border-border bg-secondary text-muted-foreground px-2 py-0.5 text-[11px] font-medium capitalize">
              {booking.recurrence || "recurring"}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground">{money(booking.price_total)}</p>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto mt-1" />
      </div>
    </Link>
  );
}