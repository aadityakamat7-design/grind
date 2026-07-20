import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, CalendarDays, Repeat } from "lucide-react";
import AppointmentCard from "@/components/grind/buyer/AppointmentCard";
import SavedWorkers from "@/components/grind/buyer/SavedWorkers";
import RecommendedTeens from "@/components/grind/buyer/RecommendedTeens";
import BookingCard from "@/components/grind/BookingCard";

export default function BuyerHome() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [saved, setSaved] = useState([]);
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b, s, profiles] = await Promise.all([
      base44.entities.Booking.filter({ buyer_user_id: user.id }, "-created_date", 50),
      base44.entities.SavedTeen.filter({ buyer_user_id: user.id }),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);
    setBookings(b);
    setSaved(s);
    setZip(profiles[0]?.zip || "");
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const active = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings
    .filter((b) => ["pending_parent_approval", "confirmed"].includes(b.status))
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status)).slice(0, 5);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Hi, {(user.full_name || "neighbor").split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">Trusted teen help, right in your neighborhood.</p>
      </div>

      <Link to="/browse" className="flex items-center gap-3 bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-100 hover:opacity-95 transition-opacity">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Search className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Browse & book local teens</p>
          <p className="text-xs opacity-80">Lawn care, tutoring, pet sitting and more</p>
        </div>
        <span className="text-xl">→</span>
      </Link>

      {active.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            Happening now
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <div className="space-y-3">
            {active.map((b) => <AppointmentCard key={b.id} booking={b} onChanged={load} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-blue-500" /> Upcoming appointments
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing booked yet — browse local teens and set up your first appointment.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => <AppointmentCard key={b.id} booking={b} onChanged={load} />)}
          </div>
        )}
      </div>

      <SavedWorkers saved={saved} />

      <RecommendedTeens zip={zip} />

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Past appointments</h2>
        {past.length === 0 ? (
          <p className="text-sm text-slate-400">Your completed jobs will show up here.</p>
        ) : (
          <div className="space-y-3">
            {past.map((b) => (
              <div key={b.id} className="space-y-1.5">
                <BookingCard booking={b} perspective="buyer" />
                {b.status === "completed" && (
                  <Link to={`/teens/${b.teen_user_id}`} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 ml-1">
                    <Repeat className="w-3 h-3" /> Book {b.teen_display_name} again
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}