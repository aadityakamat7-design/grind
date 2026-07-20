import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Repeat } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";

export default function BuyerBookings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.Booking.filter({ buyer_user_id: user.id }, "-created_date");
    setBookings(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const active = bookings.filter((b) => !["completed", "cancelled", "denied"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">My bookings</h1>
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings yet"
          subtitle="Browse teens in your neighborhood and book your first job."
          action={<Link to="/browse" className="text-sm font-bold text-blue-600 hover:text-blue-700">Browse services →</Link>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Active</h2>
              {active.map((b) => <BookingCard key={b.id} booking={b} perspective="buyer" />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Past</h2>
              {past.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <BookingCard booking={b} perspective="buyer" />
                  {b.status === "completed" && (
                    <Link
                      to={`/teens/${b.teen_user_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 ml-1"
                    >
                      <Repeat className="w-3 h-3" /> Book {b.teen_display_name} again
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}