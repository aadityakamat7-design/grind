import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Users } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import PageHeader from "@/components/grind/PageHeader";
import EmptyState from "@/components/grind/EmptyState";
import StudentIncomeCard from "@/components/grind/parent/StudentIncomeCard";
import ApprovalQueue from "@/components/grind/parent/ApprovalQueue";
import SafetyPanel from "@/components/grind/parent/SafetyPanel";

import PayoutStatusCard from "@/components/grind/parent/PayoutStatusCard";
import LockedSetupCard from "@/components/grind/parent/LockedSetupCard";
import LinkTeenDialog from "@/components/grind/parent/LinkTeenDialog";
import LinkTeenCard from "@/components/grind/parent/LinkTeenCard";
import IdentityVerificationGate from "@/components/grind/parent/IdentityVerificationGate";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import ParentStatsGrid from "@/components/grind/parent/ParentStatsGrid";
import WeeklyHoursCard from "@/components/grind/parent/WeeklyHoursCard";
import { getVerifiedAgeFromPrivate } from "@/lib/stateWorkRules";
import { EarningsAreaChart } from "@/components/grind/TimeRangeChart";
import ErrorRetry from "@/components/grind/ErrorRetry";
import PullToRefresh from "@/components/PullToRefresh";
import BuyerModeCard from "@/components/grind/parent/BuyerModeCard";

export default function ParentDashboard() {
  const { user, reload } = useOutletContext();
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [records, setRecords] = useState([]);
  const [connectStatus, setConnectStatus] = useState("not_setup");
  const [parentProfile, setParentProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [teenProfiles, setTeenProfiles] = useState([]);
  const [teenPrivates, setTeenPrivates] = useState([]);
  const [selected, setSelected] = useState("all");
  const [pendingLinks, setPendingLinks] = useState([]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const allLinks = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id });
      const confirmed = allLinks.filter((l) => l.status === "confirmed");
      const pending = allLinks.filter((l) => l.status === "pending");
      const teenIds = confirmed.map((l) => l.teen_user_id);
      const [b, r, profiles, notifs, tp, tpd] = await Promise.all([
        teenIds.length ? base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 100) : [],
        teenIds.length ? base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }, "-occurred_at", 200) : [],
        base44.entities.ParentProfile.filter({ user_id: user.id }),
        base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 20),
        teenIds.length ? base44.entities.TeenProfile.filter({ user_id: { $in: teenIds } }) : [],
        teenIds.length ? base44.entities.TeenPrivateData.filter({ user_id: { $in: teenIds } }) : [],
      ]);
      setLinks(confirmed);
      setPendingLinks(pending);
      setBookings(b);
      setRecords(r);
      setParentProfile(profiles[0] || null);
      setConnectStatus(profiles[0]?.connect_status || "not_setup");
      setNotifications(notifs);
      setTeenProfiles(tp);
      setTeenPrivates(tpd);
    } catch (err) {
      console.error("ParentDashboard load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubBooking = base44.entities.Booking.subscribe(() => load());
    const unsubLink = base44.entities.ParentTeenLink.subscribe(() => load());
    const unsubEarn = base44.entities.EarningsRecord.subscribe(() => load());
    return () => { unsubBooking(); unsubLink(); unsubEarn(); };
  }, [load]);

  if (user.app_role !== "parent") return <Navigate to="/" replace />;

  if (loading)
    return (
      <div className="space-y-5">
        <div className="h-8 w-56 rounded-lg bg-muted skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-24 skeleton-shimmer" />)}
        </div>
        <div className="bg-card rounded-2xl border border-border h-48 skeleton-shimmer" />
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  if (links.length === 0 && pendingLinks.length === 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <PageHeader title="Parent dashboard" subtitle="Full visibility into your student's activity." />
          <EmptyState icon={Users} title="No linked students yet" subtitle="Ask your teen for their parent code and enter it below to link their account." />
          <LinkTeenCard onLinked={load} />
        </div>
      </PullToRefresh>
    );

  if (links.length === 0 && pendingLinks.length > 0)
    return (
      <PullToRefresh onRefresh={load}>
        <div className="space-y-6">
          <PageHeader title="Parent dashboard" subtitle="You're almost there — one more step to activate your teen's account." />
          {pendingLinks.map((l) => (
            <div key={l.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-700 text-sm">Linked with {l.teen_display_name} — pending activation</p>
              <p className="text-xs text-amber-600 mt-1">Verify your government ID to activate your teen's account and connect your payout account.</p>
            </div>
          ))}
          <Button className="w-full rounded-xl" size="lg" onClick={() => setVerifyOpen(true)}>
            <ShieldCheck className="w-4 h-4" /> Verify my ID & set up payouts
          </Button>
          <div className="pt-2">
            <LinkTeenDialog onLinked={load} />
          </div>
          <IdentityVerificationGate
            open={verifyOpen}
            onOpenChange={setVerifyOpen}
            onVerified={() => { setVerifyOpen(false); load(); }}
          />
        </div>
      </PullToRefresh>
    );

  const shownLinks = selected === "all" ? links : links.filter((l) => l.teen_user_id === selected);
  const shownIds = shownLinks.map((l) => l.teen_user_id);
  const shownBookings = bookings.filter((b) => shownIds.includes(b.teen_user_id));
  const shownRecords = records.filter((r) => shownIds.includes(r.teen_user_id));
  const weekAgo = Date.now() - 7 * 86400000;

  const pending = shownBookings.filter((b) => b.status === "pending_parent_approval");
  const activeJobs = shownBookings.filter((b) => b.status === "in_progress");
  const upcoming = shownBookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const alerts = notifications.filter((n) => n.type === "safety").slice(0, 1);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <PageHeader title="Parent dashboard" subtitle="Full visibility into your student's activity." />

        <BuyerModeCard user={user} reload={reload} />

        {parentProfile?.is_identity_verified && parentProfile?.connect_status === "active" && (
          <PayoutStatusCard profile={parentProfile} onUpdated={load} returnPath="/parent" />
        )}
        {!(parentProfile?.is_identity_verified && parentProfile?.connect_status === "active") && (
          <LockedSetupCard profile={parentProfile} onStartSetup={() => setVerifyOpen(true)} />
        )}

        <ParentStatsGrid records={records} bookings={bookings} links={links} teenProfiles={teenProfiles} pendingApprovals={bookings.filter((b) => b.status === "pending_parent_approval").length} />

        {links.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {[{ teen_user_id: "all", teen_display_name: "All students" }, ...links].map((l) => (
              <button
                key={l.teen_user_id}
                onClick={() => setSelected(l.teen_user_id)}
                className={`shrink-0 rounded-full px-4 h-9 text-[13px] font-semibold transition-colors ${
                  selected === l.teen_user_id ? "bg-primary text-primary-foreground shadow-soft" : "bg-card border border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {l.teen_display_name}
              </button>
            ))}
          </div>
        )}

        {selected !== "all" && shownRecords.length > 0 && (
          <div>
            <h2 className="text-[17px] font-bold text-foreground mb-3">Earnings over time</h2>
            <EarningsAreaChart data={shownRecords} valueKey="net_amount" dateKey="occurred_at" color="#2E6BE0" height={180} />
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
          const teenProfile = teenProfiles.find((p) => p.user_id === l.teen_user_id);
          const teenPrivate = teenPrivates.find((p) => p.user_id === l.teen_user_id);
          const teenAge = getVerifiedAgeFromPrivate(teenPrivate);
          const teenBookings = bookings.filter((b) => b.teen_user_id === l.teen_user_id);
          return (
            <div key={l.id} className="space-y-3">
              <WeeklyHoursCard
                teenName={l.teen_display_name?.split(" ")[0]}
                teenState={teenProfile?.state}
                teenAge={teenAge}
                bookings={teenBookings}
              />
              <StudentIncomeCard
                name={l.teen_display_name?.split(" ")[0]}
                total={total}
                week={week}
                pending={pendingEscrow}
                connectStatus={connectStatus}
                rating={teenProfile?.avg_rating}
                reviewCount={teenProfile?.review_count}
                jobsCompleted={teenProfile?.jobs_completed}
              />
            </div>
          );
        })}

        <ApprovalQueue pending={pending} onDecided={load} />

        <SafetyPanel activeJobs={activeJobs} alerts={alerts} />

        <section>
          <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-[18px] h-[18px] text-muted-foreground" /> Upcoming appointments
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-[14px] text-muted-foreground">Nothing scheduled — approved bookings will appear here with date, time, and location.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          )}
        </section>

        <div className="pt-2">
          <LinkTeenDialog onLinked={load} />
        </div>

        <IdentityVerificationGate
          open={verifyOpen}
          onOpenChange={setVerifyOpen}
          onVerified={() => { setVerifyOpen(false); load(); }}
        />
      </div>
    </PullToRefresh>
  );
}