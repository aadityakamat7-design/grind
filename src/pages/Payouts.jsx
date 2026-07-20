import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { money } from "@/lib/grind";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Payouts() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profiles, links] = await Promise.all([
        base44.entities.ParentProfile.filter({ created_by_id: user.id }),
        base44.entities.ParentTeenLink.filter({ parent_user_id: user.id }),
      ]);
      setProfile(profiles[0] || null);
      const teenIds = links.map((l) => l.teen_user_id);
      if (teenIds.length) {
        const bks = await base44.entities.Booking.filter(
          { teen_user_id: { $in: teenIds }, payment_status: "released" },
          "-created_date", 100
        );
        setBookings(bks);
      }
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const total = bookings.reduce((s, b) => s + (b.price_total - (b.platform_fee || 0)), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Payouts</h1>
        <p className="text-muted-foreground text-sm">Your teens' earnings, paid to your account.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-bold text-sm">Payout account</div>
          <div className="text-xs text-muted-foreground">Connected as {profile?.full_name}</div>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
        </span>
      </div>

      <div className="bg-primary text-primary-foreground rounded-2xl p-6">
        <div className="text-sm opacity-80">Total paid out</div>
        <div className="font-display text-4xl font-extrabold">{money(total)}</div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No payouts yet. They appear here once jobs are completed and confirmed.
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-heading font-semibold text-sm">{b.listing_title}</div>
                <div className="text-xs text-muted-foreground">
                  {b.teen_display_name} · {b.buyer_confirmed_at ? format(new Date(b.buyer_confirmed_at), "MMM d, yyyy") : ""}
                </div>
              </div>
              <div className="font-display font-bold text-emerald-700">
                +{money(b.price_total - (b.platform_fee || 0))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}