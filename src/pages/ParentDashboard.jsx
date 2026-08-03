import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, CalendarDays } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import StudentIncomeCard from "@/components/grind/parent/StudentIncomeCard";
import ApprovalQueue from "@/components/grind/parent/ApprovalQueue";
import SafetyPanel from "@/components/grind/parent/SafetyPanel";
import ActivityFeed from "@/components/grind/parent/ActivityFeed";
import PayoutStatusCard from "@/components/grind/parent/PayoutStatusCard";
import LinkTeenDialog from "@/components/grind/parent/LinkTeenDialog";
import LinkTeenCard from "@/components/grind/parent/LinkTeenCard";
import PullToRefresh from "@/components/PullToRefresh";

export default function ParentDashboard() {
  const { user } = useOutletContext();
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [records, setRecords] = useState([]);
  const [connectStatus, setConnectStatus] = useState("not_setup");
  const [parentProfile, setParentProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState("all");
  const [pendingLinks, setPendingLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const allLinks = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id });
    const confirmed = allLinks.filter((l) => l.status === "confirmed");
    const pending = allLinks.filter((l) => l.status === "pending");
    const teenIds = confirmed.map((l) => l.teen_user_id);
    const [b, r, profiles, notifs] = await Promise.all([
      teenIds.length ? base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 50) : [],
      teenIds.length ? base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }) : [],
      base44.entities.ParentProfile.filter({ user_id: user.id }),
      base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 10),
    ]);
    setLinks(confirmed);
    setPendingLinks(pending);
    setBookings(b);
    setRecords(r);
    setParentProfile(profiles[0] || null);
    setConnectStatus(profiles[0]?.connect_status || "not_setup");
    setNotifications(notifs);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: reload when any booking or link changes
  useEffect(() => {
    const unsubBooking = base44.entities.Booking.subscribe(() => load());
    const unsubLink = base44.entities.ParentTeenLink.subscribe(() => load());
    return () => { unsubBooking(); unsubLink(); };
  }, [load]);

  if (user.app_role !== "parent") return <Navigate to="/" replace />;

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" /></div>;

  if (links.length === 0 && pendingLinks.length === 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">Parent dashboard</h1>
          <EmptyState icon={Users} title="No linked students yet" subtitle="Ask your teen for their parent code and enter it below to link their account." />
          <LinkTeenCard onLinked={load} />
        </div>
      </PullToRefresh>
    );

  if (links.length === 0 && pendingLinks.length > 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parent dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">You're almost there — one more step to activate your teen's account.</p>
          </div>
          {pendingLinks.map((l) => (
            <div key={l.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-700 text-sm">Linked with {l.teen_display_name} — pending activation</p>
              <p className="text-xs text-amber-600 mt-1">Verify your government ID below to activate your teen's account and start approving their jobs.</p>
            </div>
          ))}
          {parentProfile && (
            <PayoutStatusCard profile={parentProfile} onUpdated={load} returnPath="/parent" />
          )}
          <div className="pt-2">
            <LinkTeenDialog onLinked={load} />
          </div>
        </div>
      </PullToRefresh>
    );

  if (bookings.length === 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Parent dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">You'll see jobs to approve here once your teen gets their first request.</p>
          </div>
          {parentProfile && (
            <PayoutStatusCard profile={parentProfile} onUpdated={load} returnPath="/parent" locked />
          )}
          <div className="pt-2">
            <LinkTeenDialog onLinked={load} />
          </div>
        </div>
      </PullToRefresh>
    );

  const shownLinks = selected === "all" ? links : links.filter((l) => l.teen_user_id === selected);
  const shownIds = shownLinks.map((l) => l.teen_user_id);
  const shownBookings = bookings.filter((b) => shownIds.includes(b.teen_user_id));
  const weekAgo = Date.now() - 7 * 86400000;

  const pending = shownBookings.filter((b) => b.status === "pending_parent_approval");
  const activeJobs = shownBookings.filter((b) => b.status === "in_progress");
  const upcoming = shownBookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const alerts = notifications.filter((n) => n.type === "safety").slice(0, 1);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parent dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Full visibility into your student's activity.</p>
      </div>

      {parentProfile && (
        <PayoutStatusCard profile={parentProfile} onUpdated={load} returnPath="/parent" />
      )}

      {links.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {[{ teen_user_id: "all", teen_display_name: "All students" }, ...links].map((l) => (
            <button
              key={l.teen_user_id}
              onClick={() => setSelected(l.teen_user_id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                selected === l.teen_user_id ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {l.teen_display_name}
            </button>
          ))}
        </div>
      )}

      {shownLinks.map((l) => {
        const teenRecords = records.filter((r) => r.teen_user_id === l.teen_user_id);
        const total = teenRecords.reduce((s, r) => s + (r.net_amount || 0), 0);
        const week = teenRecords
          .filter((r) => r.occurred_at && new Date(r.occurred_at) > weekAgo)
          .reduce((s, r) => s + (r.net_amount || 0), 0);
        const pendingEscrow = bookings
          .filter((b) => b.teen_user_id === l.teen_user_id && b.payment_status === "held" && ["confirmed", "in_progress", "completed"].includes(b.status))
          .reduce((s, b) => s + (b.net_amount || 0), 0);
        return (
          <StudentIncomeCard
            key={l.id}
            name={l.teen_display_name?.split(" ")[0]}
            total={total}
            week={week}
            pending={pendingEscrow}
            connectStatus={connectStatus}
          />
        );
      })}

      <ApprovalQueue pending={pending} onDecided={load} />

      <SafetyPanel activeJobs={activeJobs} alerts={alerts} />

      <div>
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-muted-foreground" /> Upcoming appointments
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled — approved bookings will appear here with date, time, and location.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        )}
      </div>

      <ActivityFeed notifications={notifications} />

      <div className="pt-2">
        <LinkTeenDialog onLinked={load} />
      </div>
    </div>
    </PullToRefresh>
  );
}