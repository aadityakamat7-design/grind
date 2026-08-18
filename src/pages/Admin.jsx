import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, Search, CalendarDays, Wallet, Flag, BadgeCheck, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/grind/PageHeader";
import ReportRow from "@/components/grind/admin/ReportRow";
import PayoutReviewQueue from "@/components/grind/admin/PayoutReviewQueue";
import CredentialReviewQueue from "@/components/grind/admin/CredentialReviewQueue";
import AdminCharts from "@/components/grind/admin/AdminCharts";
import StatCard from "@/components/grind/StatCard";
import StatusBadge from "@/components/grind/StatusBadge";
import ErrorRetry from "@/components/grind/ErrorRetry";
import { money } from "@/lib/grind";

export default function Admin() {
  const { user } = useOutletContext();
  const [teens, setTeens] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [parents, setParents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (user?.app_role !== "admin") { setLoading(false); return; }
    try {
      setError(false);
      const [t, b, p, bk, r, creds] = await Promise.all([
        base44.entities.TeenProfile.list("-created_date", 500),
        base44.entities.BuyerProfile.list("-created_date", 500),
        base44.entities.ParentProfile.list("-created_date", 500),
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.Report.list("-created_date", 100),
        base44.entities.Credential.filter({ status: "pending" }, "-created_date", 100),
      ]);
      setTeens(t);
      setBuyers(b);
      setParents(p);
      setBookings(bk);
      setReports(r);
      setCredentials(creds);
    } catch (err) {
      console.error("Admin load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubBooking = base44.entities.Booking.subscribe(() => load());
    const unsubReport = base44.entities.Report.subscribe(() => load());
    return () => { unsubBooking(); unsubReport(); };
  }, [load]);

  if (user?.app_role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-lg font-bold text-foreground">Admins only</p>
        <p className="text-[14px] text-muted-foreground mt-1">You don't have access to this page.</p>
      </div>
    );
  }

  if (loading)
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-lg bg-muted skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-24 skeleton-shimmer" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border h-56 skeleton-shimmer" />
          <div className="bg-card rounded-2xl border border-border h-56 skeleton-shimmer" />
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const resolve = async (report) => {
    setActing(true);
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    load();
  };

  const hideReview = async (report) => {
    setActing(true);
    await base44.entities.Review.update(report.review_id, { hidden: true });
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    load();
  };

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const newTeensWeek = teens.filter((t) => t.created_date && new Date(t.created_date) > weekAgo).length;
  const newBuyersWeek = buyers.filter((b) => b.created_date && new Date(b.created_date) > weekAgo).length;
  const newParentsWeek = parents.filter((p) => p.created_date && new Date(p.created_date) > weekAgo).length;
  const newSignupsWeek = newTeensWeek + newBuyersWeek + newParentsWeek;

  const newTeensMonth = teens.filter((t) => t.created_date && new Date(t.created_date) > monthAgo).length;
  const newBuyersMonth = buyers.filter((b) => b.created_date && new Date(b.created_date) > monthAgo).length;
  const newParentsMonth = parents.filter((p) => p.created_date && new Date(p.created_date) > monthAgo).length;
  const newSignupsMonth = newTeensMonth + newBuyersMonth + newParentsMonth;

  const validBookings = bookings.filter((b) => !["cancelled", "denied"].includes(b.status));
  const gmv = validBookings.reduce((s, b) => s + (b.price_total || 0), 0);
  const platformRevenue = validBookings.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const completed = bookings.filter((b) => b.status === "completed");
  const activeJobs = bookings.filter((b) => b.status === "in_progress");
  const completionRate = bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0;
  const avgBookingValue = validBookings.length > 0 ? gmv / validBookings.length : 0;

  const openReports = reports.filter((r) => r.status === "open");
  const pendingCreds = credentials.filter((c) => c.status === "pending");

  const bookingsByStatus = {
    pending_parent_approval: bookings.filter((b) => b.status === "pending_parent_approval").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    in_progress: activeJobs.length,
    completed: completed.length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    denied: bookings.filter((b) => b.status === "denied").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin console" subtitle="Marketplace health, moderation, and verifications." />

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Teens" value={teens.length} subtitle={`${newTeensWeek} this week`} accent="text-primary" />
          <StatCard icon={Search} label="Neighbors" value={buyers.length} subtitle={`${newBuyersWeek} this week`} accent="text-primary" />
          <StatCard icon={ShieldCheck} label="Parents" value={parents.length} subtitle={`${newParentsWeek} this week`} accent="text-primary" />
          <StatCard icon={TrendingUp} label="New signups" value={newSignupsWeek} subtitle={`${newSignupsMonth} this month`} accent="text-emerald-600" />
        </div>
      </div>

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Bookings & revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={CalendarDays} label="Total bookings" value={bookings.length} subtitle={`${bookingsByStatus.in_progress} active now`} accent="text-primary" />
          <StatCard icon={Wallet} label="GMV" value={money(gmv)} subtitle="gross booking value" accent="text-emerald-600" />
          <StatCard icon={TrendingUp} label="Platform revenue" value={money(platformRevenue)} subtitle="15% take rate" accent="text-amber-600" />
          <StatCard icon={CheckCircle2} label="Completion rate" value={`${completionRate}%`} subtitle={`${completed.length} completed`} accent="text-emerald-600" />
          <StatCard icon={CalendarDays} label="Avg booking value" value={money(avgBookingValue)} subtitle="per job" accent="text-primary" />
          <StatCard icon={CheckCircle2} label="Pending approval" value={bookingsByStatus.pending_parent_approval} subtitle="awaiting parent" accent="text-amber-600" />
          <StatCard icon={CalendarDays} label="Confirmed" value={bookingsByStatus.confirmed} subtitle="upcoming" accent="text-primary" />
          <StatCard icon={AlertTriangle} label="Cancelled/denied" value={bookingsByStatus.cancelled + bookingsByStatus.denied} subtitle="all time" accent="text-destructive" />
        </div>
      </div>

      <AdminCharts bookings={bookings} />

      <div>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Pending review</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={BadgeCheck} label="Credentials" value={pendingCreds.length} subtitle="awaiting review" accent={pendingCreds.length > 0 ? "text-amber-600" : "text-emerald-600"} />
          <StatCard icon={Flag} label="Open reports" value={openReports.length} subtitle="needs attention" accent={openReports.length > 0 ? "text-destructive" : "text-emerald-600"} />
          <StatCard icon={AlertTriangle} label="Payout reviews" value={bookings.filter((b) => b.payout_status === "pending_review").length} subtitle="flagged" accent="text-amber-600" />
        </div>
      </div>

      <PayoutReviewQueue bookings={bookings} onDone={load} />

      <CredentialReviewQueue credentials={credentials} onDone={load} />

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Flag className="w-[18px] h-[18px] text-rose-500" /> Reports {openReports.length > 0 && `(${openReports.length} open)`}
        </h2>
        {reports.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No reports filed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => <ReportRow key={r.id} report={r} onResolve={resolve} onHideReview={hideReview} acting={acting} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-[18px] h-[18px]" /> Teen management
        </h2>
        {teens.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No teens yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {teens.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-[14px] truncate">{t.display_name}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{t.resolved_city || t.state || "—"} · {t.jobs_completed || 0} jobs · {t.avg_rating ? `${t.avg_rating.toFixed(1)}★` : "no rating"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={acting}
                  onClick={async () => {
                    setActing(true);
                    await base44.entities.TeenProfile.update(t.id, { status: t.status === "suspended" ? "active" : "suspended" });
                    setActing(false);
                    load();
                  }}
                >
                  {t.status === "suspended" ? "Unsuspend" : "Suspend"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <BadgeCheck className="w-[18px] h-[18px] text-primary" /> Neighbor verifications
        </h2>
        {buyers.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No neighbors yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {buyers.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-[14px] truncate">{b.full_name || "Neighbor"}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">ZIP {b.zip || "—"} · {b.jobs_completed || 0} jobs · {b.avg_rating ? `${b.avg_rating.toFixed(1)}★` : "no rating"}</p>
                </div>
                <StatusBadge status={b.id_verification_status === "verified" ? "active" : "pending"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}