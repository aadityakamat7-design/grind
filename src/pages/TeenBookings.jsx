import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import ErrorRetry from "@/components/grind/ErrorRetry";
import PullToRefresh from "@/components/PullToRefresh";

export default function TeenBookings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date");
      setBookings(data);
    } catch (err) {
      console.error("TeenBookings load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe(() => load());
    return unsub;
  }, [load]);

  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-20 skeleton-shimmer" />)}
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  // A booking isn't real/active until its escrow payment is confirmed held.
  // Unpaid pending bookings (buyer abandoned Stripe Checkout) are hidden from
  // the Active list — the 30-min cleanup workflow cancels them automatically.
  const isActive = (b) => !["completed", "cancelled", "denied", "abandoned", "payment_pending"].includes(b.status) && b.payment_status !== "unpaid";
  const active = bookings.filter(isActive);
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status));

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6">
      <PageHeader title="Bookings" subtitle="All your active and past jobs." />

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings yet"
          subtitle="When a neighbor books one of your services, it'll show up here. Check the job board for open work near you."
          action={<Link to="/jobs" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-5 h-10 shadow-soft hover:opacity-90 transition-opacity">Find jobs</Link>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold text-foreground mb-3">Active</h2>
              <div className="space-y-3">
                {active.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold text-foreground mb-3">Past</h2>
              <div className="space-y-3">
                {past.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}