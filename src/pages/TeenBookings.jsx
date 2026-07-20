import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";

export default function TeenBookings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date");
    setBookings(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" /></div>;

  const active = bookings.filter((b) => !["completed", "cancelled", "denied"].includes(b.status));
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Bookings</h1>
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings yet" subtitle="When a neighbor books one of your services, it'll show up here." />
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Active</h2>
              {active.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-900">Past</h2>
              {past.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}