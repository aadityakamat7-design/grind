import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { money, notify } from "@/lib/grind";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, Calendar, User } from "lucide-react";
import { format } from "date-fns";

export default function Approvals() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const load = async () => {
    const links = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id });
    const teenIds = links.map((l) => l.teen_user_id);
    if (teenIds.length === 0) { setBookings([]); setLoading(false); return; }
    const bks = await base44.entities.Booking.filter(
      { teen_user_id: { $in: teenIds }, status: "pending_parent_approval" },
      "-created_date"
    );
    setBookings(bks);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.id]);

  const decide = async (b, approve) => {
    setActing(b.id);
    if (approve) {
      await base44.entities.Booking.update(b.id, { status: "confirmed", parent_user_id: user.id });
      const threads = await base44.entities.MessageThread.filter({ booking_id: b.id });
      if (threads[0]) await base44.entities.MessageThread.update(threads[0].id, { is_confirmed: true });
      await Promise.all([
        notify(base44, b.teen_user_id, "Booking approved ✅", `Your parent approved "${b.listing_title}". The job address is now visible.`, `/bookings/${b.id}`),
        notify(base44, b.buyer_user_id, "Booking confirmed ✅", `${b.teen_display_name}'s parent approved the booking for "${b.listing_title}".`, `/bookings/${b.id}`),
      ]);
    } else {
      await base44.entities.Booking.update(b.id, { status: "cancelled", payment_status: "refunded", parent_user_id: user.id });
      await Promise.all([
        notify(base44, b.teen_user_id, "Booking denied", `Your parent denied "${b.listing_title}".`, `/bookings/${b.id}`),
        notify(base44, b.buyer_user_id, "Booking denied — refunded", `The parent denied this booking. Your escrow payment of ${money(b.price_total)} was refunded.`, `/bookings/${b.id}`),
      ]);
    }
    setActing(null);
    load();
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Approvals</h1>
        <p className="text-muted-foreground text-sm">Every booking needs your OK before anything happens.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-heading font-semibold">All clear</p>
          <p className="text-sm text-muted-foreground">No bookings waiting for your approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-heading font-bold">{b.listing_title}</div>
                  <div className="text-sm text-muted-foreground">for {b.teen_display_name}</div>
                </div>
                <div className="font-display font-extrabold">{money(b.price_total)}</div>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> Booked by {b.buyer_name} (ID-verified)</div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {b.scheduled_start ? format(new Date(b.scheduled_start), "EEE, MMM d · h:mm a") : "TBD"}
                </div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {b.address}</div>
                {b.notes && <p className="text-xs italic">"{b.notes}"</p>}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 rounded-full" onClick={() => decide(b, true)} disabled={acting === b.id}>
                  Approve
                </Button>
                <Button variant="outline" className="flex-1 rounded-full text-destructive border-destructive/30" onClick={() => decide(b, false)} disabled={acting === b.id}>
                  Deny & refund
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}