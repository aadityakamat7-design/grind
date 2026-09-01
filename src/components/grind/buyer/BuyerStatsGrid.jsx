import React from "react";
import StatCard from "@/components/grind/StatCard";
import { Wallet, TrendingUp, CalendarDays, Star, Briefcase } from "lucide-react";
import { money } from "@/lib/grind";

export default function BuyerStatsGrid({ bookings, profile }) {
  const now = Date.now();
  const monthAgo = now - 30 * 86400000;

  const completed = bookings.filter((b) => b.status === "completed");
  const totalSpent = completed.reduce((s, b) => s + (b.price_total || 0), 0);
  const monthSpent = completed
    .filter((b) => b.buyer_finished_at && new Date(b.buyer_finished_at) > monthAgo)
    .reduce((s, b) => s + (b.price_total || 0), 0);
  const upcoming = bookings.filter((b) => ["pending_parent_approval", "confirmed"].includes(b.status));
  const active = bookings.filter((b) => b.status === "in_progress");

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatCard icon={Wallet} label="Total spent" value={money(totalSpent)} subtitle="all time" to="/buyer/bookings" accent="text-primary" />
      <StatCard icon={TrendingUp} label="This month" value={money(monthSpent)} subtitle="last 30 days" to="/buyer/bookings" accent="text-emerald-600" />
      <StatCard icon={CalendarDays} label="Upcoming" value={upcoming.length + active.length} subtitle={`${active.length} active now`} to="/buyer/bookings" accent="text-primary" />
      <StatCard icon={Star} label="Your rating" value={profile?.avg_rating ? profile.avg_rating.toFixed(1) : "—"} subtitle={`${profile?.review_count || 0} teen reviews`} to="/buyer/bookings" accent="text-amber-500" />
      <StatCard icon={Briefcase} label="Total bookings" value={bookings.length} subtitle="all time" to="/buyer/bookings" accent="text-primary" />
    </div>
  );
}