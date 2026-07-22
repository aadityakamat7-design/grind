import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, CalendarDays, UserPlus } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import StudentIncomeCard from "@/components/grind/parent/StudentIncomeCard";
import ApprovalQueue from "@/components/grind/parent/ApprovalQueue";
import SafetyPanel from "@/components/grind/parent/SafetyPanel";
import ActivityFeed from "@/components/grind/parent/ActivityFeed";
import LinkTeenCard from "@/components/grind/parent/LinkTeenCard";
import { Button } from "@/components/ui/button";
import PullToRefresh from "@/components/PullToRefresh";

export default function ParentDashboard() {
  const { user } = useOutletContext();
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [records, setRecords] = useState([]);
  const [connectStatus, setConnectStatus] = useState("not_setup");
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);

  const load = useCallback(async () => {
    const myLinks = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id, status: "confirmed" });
    const teenIds = myLinks.map((l) => l.teen_user_id);
    const [b, r, profiles, notifs] = await Promise.all([
      teenIds.length ? base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 50) : [],
      teenIds.length ? base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }) : [],
      base44.entities.ParentProfile.filter({ user_id: user.id }),
      base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 10),
    ]);
    setLinks(myLinks);
    setBookings(b);
    setRecords(r);
    setConnectStatus(profiles[0]?.connect_status || "not_setup");
    setNotifications(notifs);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  if (links.length === 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Parent dashboard</h1>
          <EmptyState icon={Users} title="No linked students yet" subtitle="Ask your teen for their parent code and link their account to see their jobs, income, and safety status here." />
          <LinkTeenCard onLinked={load} />
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Parent dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Full visibility into your student's activity.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => setShowLinkForm((v) => !v)}>
          <UserPlus className="w-4 h-4 mr-1.5" /> Link student
        </Button>
      </div>

      {showLinkForm && (
        <LinkTeenCard
          onLinked={() => {
            setShowLinkForm(false);
            load();
          }}
        />
      )}

      {links.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {[{ teen_user_id: "all", teen_display_name: "All students" }, ...links].map((l) => (
            <button
              key={l.teen_user_id}
              onClick={() => setSelected(l.teen_user_id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                selected === l.teen_user_id ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
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
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-blue-500" /> Upcoming appointments
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing scheduled — approved bookings will appear here with date, time, and location.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        )}
      </div>

      <ActivityFeed notifications={notifications} />
    </div>
    </PullToRefresh>
  );
}