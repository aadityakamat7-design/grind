import React from "react";
import StatCard from "@/components/grind/StatCard";
import { Wallet, TrendingUp, CalendarDays, Star, Briefcase, CheckCircle2, PlayCircle, Clock } from "lucide-react";
import { money } from "@/lib/grind";

export default function TeenStatsGrid({ records, bookings, profile }) {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const totalEarned = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const weekEarned = records.filter((r) => r.occurred_at && new Date(r.occurred_at) > weekAgo).reduce((s, r) => s + (r.net_amount || 0), 0);
  const monthEarned = records.filter((r) => r.occurred_at && new Date(r.occurred_at) > monthAgo).reduce((s, r) => s + (r.net_amount || 0), 0);
  const pendingPayout = bookings
    .filter((b) => b.payment_status === "held" && ["confirmed", "in_progress", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.net_amount || 0), 0);

  const completed = bookings.filter((b) => b.status === "completed");
  const completedThisMonth = completed.filter((b) => b.teen_finished_at && new Date(b.teen_finished_at) > monthAgo);
  const active = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const cancelled = bookings.filter((b) => ["cancelled", "denied"].includes(b.status));
  const completionRate = completed.length + cancelled.length > 0
    ? Math.round((completed.length / (completed.length + cancelled.length)) * 100)
    : null;
  const accepted = bookings.filter((b) => !["cancelled", "denied"].includes(b.status));
  const acceptanceRate = bookings.length > 0 ? Math.round((accepted.length / bookings.length) * 100) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Wallet} label="Total earned" value={money(totalEarned)} subtitle="all time" to="/teen/earnings" accent="text-primary" />
      <StatCard icon={TrendingUp} label="This week" value={money(weekEarned)} subtitle="last 7 days" to="/teen/earnings" accent="text-emerald-600" />
      <StatCard icon={CalendarDays} label="This month" value={money(monthEarned)} subtitle="last 30 days" to="/teen/earnings" accent="text-primary" />
      <StatCard icon={Clock} label="Pending payout" value={money(pendingPayout)} subtitle="in escrow" to="/teen/bookings" accent="text-amber-600" />
      <StatCard icon={CheckCircle2} label="Jobs completed" value={completed.length} subtitle={`${completedThisMonth.length} this month`} to="/teen/bookings" accent="text-emerald-600" />
      <StatCard icon={PlayCircle} label="Active jobs" value={active.length} subtitle={`${upcoming.length} upcoming`} to="/teen/bookings" accent="text-primary" />
      <StatCard icon={Star} label="Avg rating" value={profile?.avg_rating ? profile.avg_rating.toFixed(1) : "—"} subtitle={`${profile?.review_count || 0} reviews`} to="/teen/listings" accent="text-amber-500" />
      <StatCard
        icon={Briefcase}
        label="Completion rate"
        value={completionRate != null ? `${completionRate}%` : "—"}
        subtitle={acceptanceRate != null ? `${acceptanceRate}% accepted` : "no jobs yet"}
        to="/teen/bookings"
        accent="text-primary"
      />
    </div>
  );
}