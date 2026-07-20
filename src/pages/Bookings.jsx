import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext, Link } from "react-router-dom";
import { money } from "@/lib/grind";
import StatusBadge from "@/components/grind/StatusBadge";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

export default function Bookings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let bks = [];
      if (user.app_role === "teen") {
        bks = await base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date", 100);
      } else if (user.app_role === "buyer") {
        bks = await base44.entities.Booking.filter({ buyer_user_id: user.id }, "-created_date", 100);
      } else {
        const links = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id });
        const teenIds = links.map((l) => l.teen_user_id);
        if (teenIds.length) bks = await base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 100);
      }
      setBookings(bks);
      setLoading(false);
    })();
  }, [user.id, user.app_role]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Bookings</h1>
        <p className="text-muted-foreground text-sm">
          {user.app_role === "buyer" ? "Jobs you've booked." : "Jobs on the calendar."}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-heading font-semibold">No bookings yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-card border border-border rounded-2xl p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-heading font-semibold truncate">{b.listing_title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {user.app_role === "buyer" ? b.teen_display_name : b.buyer_name}
                    {b.scheduled_start && ` · ${format(new Date(b.scheduled_start), "MMM d, h:mm a")}`}
                    {` · ${money(b.price_total)}`}
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}