import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, CalendarDays, Repeat, ChevronRight, Star } from "lucide-react";
import AppointmentCard from "@/components/grind/buyer/AppointmentCard";
import SavedWorkers from "@/components/grind/buyer/SavedWorkers";
import RecommendedTeens from "@/components/grind/buyer/RecommendedTeens";
import BookingCard from "@/components/grind/BookingCard";
import ReferralCard from "@/components/grind/ReferralCard";
import ReviewNudge from "@/components/grind/ReviewNudge";
import PageHeader from "@/components/grind/PageHeader";
import BuyerStatsGrid from "@/components/grind/buyer/BuyerStatsGrid";
import ErrorRetry from "@/components/grind/ErrorRetry";
import PullToRefresh from "@/components/PullToRefresh";

export default function BuyerHome() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [saved, setSaved] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [b, s, profiles] = await Promise.all([
        base44.entities.Booking.filter({ buyer_user_id: user.id }, "-created_date", 100),
        base44.entities.SavedTeen.filter({ buyer_user_id: user.id }),
        base44.entities.BuyerProfile.filter({ user_id: user.id }),
      ]);
      setBookings(b);
      setSaved(s);
      setProfile(profiles[0] || null);
    } catch (err) {
      console.error("BuyerHome load failed:", err);
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
      <div className="space-y-5">
        <div className="h-8 w-56 rounded-lg bg-muted skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-24 skeleton-shimmer" />)}
        </div>
        <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const active = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings
    .filter((b) => ["pending_parent_approval", "confirmed"].includes(b.status))
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const past = bookings.filter((b) => ["completed", "cancelled", "denied"].includes(b.status)).slice(0, 5);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <PageHeader title={`Hi, ${(user.full_name || "neighbor").split(" ")[0]} 👋`} subtitle="Trusted teen help, right in your neighborhood." />

        <BuyerStatsGrid bookings={bookings} profile={profile} />

        <Link to="/browse" className="flex items-center gap-4 bg-primary rounded-2xl p-5 text-primary-foreground shadow-soft hover:opacity-95 active:scale-[0.99] transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
            <Search className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px]">Browse & book local teens</p>
            <p className="text-[13px] opacity-80 mt-0.5">Lawn care, tutoring, pet sitting and more</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-60" />
        </Link>

        {active.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[17px] font-bold text-foreground">Happening now</h2>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="space-y-3">
              {active.map((b) => <AppointmentCard key={b.id} booking={b} onChanged={load} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-[18px] h-[18px] text-muted-foreground" /> Upcoming appointments
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-[14px] text-muted-foreground">Nothing booked yet — browse local teens and set up your first appointment.</p>
              <Link to="/browse" className="inline-flex items-center gap-1.5 mt-4 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-5 h-10 shadow-soft hover:opacity-90 transition-opacity">
                <Search className="w-4 h-4" /> Browse teens
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => <AppointmentCard key={b.id} booking={b} onChanged={load} />)}
            </div>
          )}
        </section>

        <ReviewNudge user={user} bookings={bookings} />

        {profile?.avg_rating > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-foreground text-[14px]">{profile.avg_rating.toFixed(1)} ★ from teens</p>
              <p className="text-[12px] text-muted-foreground">{profile.review_count || 0} review{(profile.review_count || 0) !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        <ReferralCard profile={profile} />

        <SavedWorkers saved={saved} />

        <RecommendedTeens zip={profile?.zip || ""} />

        <section>
          <h2 className="text-[17px] font-bold text-foreground mb-3">Past appointments</h2>
          {past.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-[14px] text-muted-foreground">Your completed jobs will show up here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <BookingCard booking={b} perspective="buyer" />
                  {b.status === "completed" && (
                    <Link to={`/teens/${b.teen_user_id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline ml-1">
                      <Repeat className="w-3.5 h-3.5" /> Book {b.teen_display_name} again
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PullToRefresh>
  );
}