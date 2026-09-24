import React from "react";
import { Users, Search, CalendarDays, Wallet, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Repeat } from "lucide-react";
import StatCard from "@/components/grind/StatCard";
import AdminAnalytics from "@/components/grind/admin/AdminAnalytics";
import StripeTestModeCard from "@/components/grind/admin/StripeTestModeCard";
import IdentityVerificationToggle from "@/components/grind/admin/IdentityVerificationToggle";
import StateComplianceTable from "@/components/grind/admin/StateComplianceTable";
import ReceiptPreviewCard from "@/components/grind/admin/ReceiptPreviewCard";
import { money } from "@/lib/grind";

export default function AdminOverview({ teens, buyers, parents, bookings, listings, links, user }) {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const linkedTeens = (links || []).filter((l) => l.status === "confirmed").length;

  const newTeensWeek = teens.filter((t) => t.created_date && new Date(t.created_date) > weekAgo).length;
  const newBuyersWeek = buyers.filter((b) => b.created_date && new Date(b.created_date) > weekAgo).length;
  const newParentsWeek = parents.filter((p) => p.created_date && new Date(p.created_date) > weekAgo).length;
  const newSignupsWeek = newTeensWeek + newBuyersWeek + newParentsWeek;
  const newSignupsMonth = teens.filter((t) => t.created_date && new Date(t.created_date) > monthAgo).length
    + buyers.filter((b) => b.created_date && new Date(b.created_date) > monthAgo).length
    + parents.filter((p) => p.created_date && new Date(p.created_date) > monthAgo).length;

  const validBookings = bookings.filter((b) => !["cancelled", "denied"].includes(b.status));
  const gmv = validBookings.reduce((s, b) => s + (b.price_total || 0), 0);
  const platformRevenue = validBookings.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed");
  const activeJobs = bookings.filter((b) => b.status === "in_progress");
  const completionRate = bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0;
  const avgBookingValue = validBookings.length > 0 ? gmv / validBookings.length : 0;

  // Payout volume: sum of net_amount + tip for completed bookings
  const payoutVolume = completed.reduce((s, b) => s + (b.net_amount || 0) + (b.tip_amount || 0), 0);

  // Revenue by period
  const revenueWeek = validBookings.filter((b) => b.created_date && new Date(b.created_date) > weekAgo).reduce((s, b) => s + (b.platform_fee || 0), 0);
  const revenueMonth = validBookings.filter((b) => b.created_date && new Date(b.created_date) > monthAgo).reduce((s, b) => s + (b.platform_fee || 0), 0);

  const buyerBookingCounts = {};
  validBookings.forEach((b) => { if (b.buyer_user_id) buyerBookingCounts[b.buyer_user_id] = (buyerBookingCounts[b.buyer_user_id] || 0) + 1; });
  const totalBuyersWithBookings = Object.keys(buyerBookingCounts).length;
  const repeatBuyers = Object.values(buyerBookingCounts).filter((c) => c >= 2).length;
  const repeatBookingRate = totalBuyersWithBookings > 0 ? Math.round((repeatBuyers / totalBuyersWithBookings) * 100) : 0;

  const bookingsByStatus = {
    pending_parent_approval: bookings.filter((b) => b.status === "pending_parent_approval").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    in_progress: activeJobs.length,
    completed: completed.length,
    disputed: bookings.filter((b) => b.status === "disputed").length,
    refunded: bookings.filter((b) => b.payment_status === "refunded").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    denied: bookings.filter((b) => b.status === "denied").length,
  };

  return (
    <div className="space-y-6">
      <ReceiptPreviewCard />
      <StripeTestModeCard />
      <IdentityVerificationToggle />
      <StateComplianceTable />

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Users by role</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Teens" value={teens.length} subtitle={`${newTeensWeek} this week`} accent="text-primary" />
          <StatCard icon={Search} label="Neighbors" value={buyers.length} subtitle={`${newBuyersWeek} this week`} accent="text-primary" />
          <StatCard icon={ShieldCheck} label="Parents" value={parents.length} subtitle={`${newParentsWeek} this week`} accent="text-primary" />
          <StatCard icon={TrendingUp} label="New signups" value={newSignupsWeek} subtitle={`${newSignupsMonth} this month`} accent="text-emerald-600" />
          <StatCard icon={ShieldCheck} label="Parent-linked teens" value={linkedTeens} subtitle="confirmed links" accent="text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Bookings by status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={CalendarDays} label="Total bookings" value={bookings.length} subtitle={`${activeJobs.length} active now`} accent="text-primary" />
          <StatCard icon={AlertTriangle} label="Pending approval" value={bookingsByStatus.pending_parent_approval} subtitle="awaiting parent" accent="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Confirmed" value={bookingsByStatus.confirmed} subtitle="upcoming" accent="text-primary" />
          <StatCard icon={CalendarDays} label="In progress" value={bookingsByStatus.in_progress} subtitle="active jobs" accent="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Completed" value={bookingsByStatus.completed} subtitle="all time" accent="text-emerald-600" />
          <StatCard icon={AlertTriangle} label="Disputed" value={bookingsByStatus.disputed} subtitle="needs review" accent="text-destructive" />
          <StatCard icon={Wallet} label="Refunded" value={bookingsByStatus.refunded} subtitle="all time" accent="text-muted-foreground" />
          <StatCard icon={AlertTriangle} label="Cancelled/denied" value={bookingsByStatus.cancelled + bookingsByStatus.denied} subtitle="all time" accent="text-destructive" />
        </div>
      </div>

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Revenue & payouts</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Wallet} label="GMV" value={money(gmv)} subtitle="gross booking value" accent="text-emerald-600" />
          <StatCard icon={TrendingUp} label="Platform revenue" value={money(platformRevenue)} subtitle={`12.9% + $0.30 take rate`} accent="text-amber-600" />
          <StatCard icon={Wallet} label="Revenue this week" value={money(revenueWeek)} subtitle="last 7 days" accent="text-emerald-600" />
          <StatCard icon={Wallet} label="Revenue this month" value={money(revenueMonth)} subtitle="last 30 days" accent="text-emerald-600" />
          <StatCard icon={Wallet} label="Payout volume" value={money(payoutVolume)} subtitle="to teens/parents" accent="text-primary" />
          <StatCard icon={CheckCircle2} label="Completion rate" value={`${completionRate}%`} subtitle={`${completed.length} completed`} accent="text-emerald-600" />
          <StatCard icon={Repeat} label="Repeat-booking rate" value={`${repeatBookingRate}%`} subtitle={`${repeatBuyers} repeat buyers`} accent="text-primary" />
          <StatCard icon={CalendarDays} label="Avg booking value" value={money(avgBookingValue)} subtitle="per job" accent="text-primary" />
        </div>
      </div>

      <AdminAnalytics bookings={bookings} teens={teens} buyers={buyers} parents={parents} listings={listings} />
    </div>
  );
}