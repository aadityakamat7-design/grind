import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Users, CalendarDays, Wallet, ShieldAlert, Flag, Activity,
} from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import ErrorRetry from "@/components/grind/ErrorRetry";
import AdminOverview from "@/components/grind/admin/AdminOverview";
import AdminUsers from "@/components/grind/admin/AdminUsers";
import AdminBookings from "@/components/grind/admin/AdminBookings";
import AdminPayments from "@/components/grind/admin/AdminPayments";
import AdminDisputes from "@/components/grind/admin/AdminDisputes";
import AdminModeration from "@/components/grind/admin/AdminModeration";
import AdminSystemHealth from "@/components/grind/admin/AdminSystemHealth";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "payments", label: "Payments & Payouts", icon: Wallet },
  { id: "disputes", label: "Disputes & Safety", icon: ShieldAlert },
  { id: "moderation", label: "Moderation", icon: Flag },
  { id: "system", label: "System Health", icon: Activity },
];

export default function Admin() {
  const { user } = useOutletContext();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (user?.app_role !== "admin") { setLoading(false); return; }
    try {
      setError(false);
      const [
        users, teens, buyers, parents, bookings, reports, credentials,
        referrals, listings, links, reviews, messages, webhooks,
      ] = await Promise.all([
        base44.entities.User.list("-created_date", 500),
        base44.entities.TeenProfile.list("-created_date", 500),
        base44.entities.BuyerProfile.list("-created_date", 500),
        base44.entities.ParentProfile.list("-created_date", 500),
        base44.entities.Booking.list("-created_date", 500),
        base44.entities.Report.list("-created_date", 200),
        base44.entities.Credential.filter({ status: "pending" }, "-created_date", 100),
        base44.entities.Referral.list("-created_date", 100),
        base44.entities.Listing.list("-created_date", 500),
        base44.entities.ParentTeenLink.list("-created_date", 500),
        base44.entities.Review.list("-created_date", 500),
        base44.entities.Message.filter({ flagged: true }, "-created_date", 100),
        base44.entities.WebhookEvent.list("-created_date", 100),
      ]);
      setData({ users, teens, buyers, parents, bookings, reports, credentials, referrals, listings, links, reviews, messages, webhooks });
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
        <div className="flex gap-1 border-b border-border">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-10 w-28 rounded-lg bg-muted skeleton-shimmer" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-24 skeleton-shimmer" />)}
        </div>
      </div>
    );
  if (error || !data) return <ErrorRetry onRetry={load} />;

  const props = { ...data, user, onReload: load };

  return (
    <div className="space-y-5">
      <PageHeader title="Admin console" subtitle="Marketplace health, moderation, and operations." />

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border -mx-1 px-1 pb-px">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <AdminOverview {...props} />}
      {tab === "users" && <AdminUsers {...props} />}
      {tab === "bookings" && <AdminBookings {...props} />}
      {tab === "payments" && <AdminPayments {...props} />}
      {tab === "disputes" && <AdminDisputes {...props} />}
      {tab === "moderation" && <AdminModeration {...props} />}
      {tab === "system" && <AdminSystemHealth {...props} />}
    </div>
  );
}