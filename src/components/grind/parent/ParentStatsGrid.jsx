import React from "react";
import StatCard from "@/components/grind/StatCard";
import { Wallet, TrendingUp, CalendarDays, Star, CheckCircle2, Clock, Users, ShieldCheck } from "lucide-react";
import { money } from "@/lib/grind";

export default function ParentStatsGrid({ records, bookings, links, teenProfiles, pendingApprovals }) {
  const now = Date.now();
  const monthAgo = now - 30 * 86400000;

  const totalEarned = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const monthEarned = records.filter((r) => r.occurred_at && new Date(r.occurred_at) > monthAgo).reduce((s, r) => s + (r.net_amount || 0), 0);
  const pendingPayout = bookings
    .filter((b) => b.payment_status === "held" && ["confirmed", "in_progress", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.net_amount || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed");
  const active = bookings.filter((b) => b.status === "in_progress");

  const avgRating = teenProfiles.length > 0
    ? (teenProfiles.reduce((s, p) => s + (p.avg_rating || 0), 0) / teenProfiles.length).toFixed(1)
    : "—";
  const totalReviews = teenProfiles.reduce((s, p) => s + (p.review_count || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={Wallet} label="Total earned" value={money(totalEarned)} subtitle={`${links.length} teen${links.length !== 1 ? "s" : ""}`} to="/parent/payouts" accent="text-primary" />
      <StatCard icon={TrendingUp} label="This month" value={money(monthEarned)} subtitle="last 30 days" to="/parent/payouts" accent="text-emerald-600" />
      <StatCard icon={Clock} label="Pending payout" value={money(pendingPayout)} subtitle="in escrow" to="/parent/payouts" accent="text-amber-600" />
      <StatCard icon={ShieldCheck} label="Approvals" value={pendingApprovals} subtitle="waiting on you" to="/parent/approvals" accent={pendingApprovals > 0 ? "text-amber-600" : "text-emerald-600"} />
      <StatCard icon={CheckCircle2} label="Jobs completed" value={completed.length} subtitle="all teens" to="/parent" accent="text-emerald-600" />
      <StatCard icon={Users} label="Active jobs" value={active.length} subtitle="in progress now" to="/parent" accent="text-primary" />
      <StatCard icon={Star} label="Avg rating" value={avgRating} subtitle={`${totalReviews} reviews`} to="/parent" accent="text-amber-500" />
      <StatCard icon={Users} label="Linked teens" value={links.length} subtitle="confirmed" to="/parent" accent="text-primary" />
    </div>
  );
}