import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Repeat } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import ErrorRetry from "@/components/grind/ErrorRetry";

export default function BuyerBookings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await base44.entities.Booking.filter({ buyer_user_id: user.id }, "-created_date");
      setBookings(data);
    } catch (err) {
      console.error("BuyerBookings load failed:", err);
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

  const active = bookings.filter((b) => !["completed", "cancelled", "denied"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status));

  return (
    <div className="space-y-6">
      <PageHeader title="My bookings" subtitle="All your active and past appointments." />

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings yet"
          subtitle="Browse teens in your neighborhood and book your first job."
          action={<Link to="/browse" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-5 h-10 shadow-soft hover:opacity-90 transition-opacity">Browse services</Link>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold text-foreground mb-3">Active</h2>
              <div className="space-y-3">
                {active.map((b) => <BookingCard key={b.id} booking={b} perspective="buyer" />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-[17px] font-bold text-foreground mb-3">Past</h2>
              <div className="space-y-3">
                {past.map((b) => (
                  <div key={b.id} className="space-y-1.5">
                    <BookingCard booking={b} perspective="buyer" />
                    {b.status === "completed" && (
                      <Link
                        to={`/teens/${b.teen_user_id}`}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline ml-1"
                      >
                        <Repeat className="w-3.5 h-3.5" /> Book {b.teen_display_name} again
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}