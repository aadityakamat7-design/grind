import React from "react";
import StatCard from "@/components/grind/StatCard";
import { Wallet, TrendingUp, CalendarDays, PlayCircle, Clock } from "lucide-react";
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

  const active = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => b.status === "confirmed");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Wallet} label="Total earned" value={money(totalEarned)} subtitle="all time" to="/teen/earnings" accent="text-primary" />
      <StatCard icon={TrendingUp} label="This week" value={money(weekEarned)} subtitle="last 7 days" to="/teen/earnings" accent="text-emerald-600" />
      <StatCard icon={CalendarDays} label="This month" value={money(monthEarned)} subtitle="last 30 days" to="/teen/earnings" accent="text-primary" />
      <StatCard icon={Clock} label="Pending payout" value={money(pendingPayout)} subtitle="in escrow" to="/teen/bookings" accent="text-amber-600" />
      <StatCard icon={PlayCircle} label="Active jobs" value={active.length} subtitle={`${upcoming.length} upcoming`} to="/teen/bookings" accent="text-primary" />
    </div>
  );
}