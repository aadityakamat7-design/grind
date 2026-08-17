import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Wallet, TrendingUp, Clock, Sparkles, ChevronRight, CalendarDays, MessageCircle, Star, Briefcase } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import PageHeader from "@/components/grind/PageHeader";
import EmptyState from "@/components/grind/EmptyState";
import AvailabilityToggle from "@/components/grind/AvailabilityToggle";
import AlertParentButton from "@/components/grind/AlertParentButton";
import EarningsSummary from "@/components/grind/teen/EarningsSummary";
import ProfileStatsWidget from "@/components/grind/teen/ProfileStatsWidget";
import MessagesWidget from "@/components/grind/teen/MessagesWidget";
import InviteCodeCard from "@/components/grind/teen/InviteCodeCard";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import { getOrCreateWallet } from "@/lib/wallet";
import { genInviteCode } from "@/lib/grind";
import PullToRefresh from "@/components/PullToRefresh";

export default function TeenHome() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [weekEarned, setWeekEarned] = useState(0);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  const load = useCallback(async () => {
    const [profiles, myBookings, w, txns, myThreads] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: user.id }),
      base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date", 50),
      getOrCreateWallet(user.id),
      base44.entities.WalletTransaction.filter({ teen_user_id: user.id, type: "earning" }, "-occurred_at", 50),
      base44.entities.MessageThread.filter({ teen_user_id: user.id }, "-last_message_at", 5),
    ]);
    let p = profiles[0] || null;
    if (!p) {
      const code = genInviteCode();
      p = await base44.entities.TeenProfile.create({
        user_id: user.id,
        display_name: (user.full_name || user.email?.split("@")[0] || "Teen").slice(0, 50),
        invite_code: code,
      });
    }
    if (!p.invite_code) {
      const code = genInviteCode();
      await base44.entities.TeenProfile.update(p.id, { invite_code: code });
      p = { ...p, invite_code: code };
    }
    const weekAgo = Date.now() - 7 * 86400000;
    setProfile(p);
    setBookings(myBookings);
    setWallet(w);
    setWeekEarned(txns.filter((t) => t.occurred_at && new Date(t.occurred_at) > weekAgo).reduce((s, t) => s + t.amount, 0));
    setThreads(myThreads);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe(() => load());
    return unsub;
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  const activeJobs = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
  const pendingApproval = bookings.filter((b) => b.status === "pending_parent_approval");
  const pendingEscrow = bookings
    .filter((b) => b.payment_status === "held" && ["confirmed", "in_progress", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.net_amount || 0), 0);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <PageHeader title={`Hey, ${profile?.display_name?.split(" ")[0] || "there"} 👋`} subtitle="Here's what's happening with your hustle.">
          <Link to="/teen/listings" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-4 h-10 shadow-soft hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New service
          </Link>
        </PageHeader>

        <InviteCodeCard profile={profile} onUpdated={load} />

        <EarningsSummary
          balance={wallet?.balance || 0}
          week={weekEarned}
          pending={pendingEscrow}
          onCashOut={() => setCashOutOpen(true)}
        />

        {profile && <AvailabilityToggle profile={profile} onChanged={load} />}

        {activeJobs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[17px] font-bold text-foreground">Job in progress</h2>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="space-y-3">
              {activeJobs.map((b) => (
                <div key={b.id} className="space-y-3">
                  <BookingCard booking={b} perspective="teen" />
                  <AlertParentButton booking={b} />
                </div>
              ))}
            </div>
          </section>
        )}

        {pendingApproval.length > 0 && (
          <section>
            <h2 className="text-[17px] font-bold text-foreground mb-3">Waiting on parent approval</h2>
            <div className="space-y-3">
              {pendingApproval.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-[18px] h-[18px] text-muted-foreground" /> Upcoming jobs
            </h2>
            <Link to="/teen/bookings" className="text-[13px] font-semibold text-primary hover:underline">See all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-[14px] text-muted-foreground">
                {profile?.status === "active"
                  ? "No jobs booked yet — publish a service so neighbors can find you."
                  : "Once your parent approves your account, you can start taking jobs."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          )}
        </section>

        {profile && <ProfileStatsWidget profile={profile} />}

        <MessagesWidget threads={threads} />

        {cashOutOpen && wallet && (
          <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
        )}
      </div>
    </PullToRefresh>
  );
}