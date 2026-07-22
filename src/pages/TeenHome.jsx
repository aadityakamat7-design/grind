import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import TeenChecklist from "@/components/grind/TeenChecklist";
import AvailabilityToggle from "@/components/grind/AvailabilityToggle";
import UpcomingCalendar from "@/components/grind/UpcomingCalendar";
import AlertParentButton from "@/components/grind/AlertParentButton";
import EarningsSummary from "@/components/grind/teen/EarningsSummary";
import ProfileStatsWidget from "@/components/grind/teen/ProfileStatsWidget";
import MessagesWidget from "@/components/grind/teen/MessagesWidget";
import InviteCodeCard from "@/components/grind/teen/InviteCodeCard";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import { getOrCreateWallet } from "@/lib/wallet";
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
    const weekAgo = Date.now() - 7 * 86400000;
    setProfile(profiles[0] || null);
    setBookings(myBookings);
    setWallet(w);
    setWeekEarned(txns.filter((t) => t.occurred_at && new Date(t.occurred_at) > weekAgo).reduce((s, t) => s + t.amount, 0));
    setThreads(myThreads);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const activeJobs = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
  const pendingApproval = bookings.filter((b) => b.status === "pending_parent_approval");
  const pendingEscrow = bookings
    .filter((b) => b.payment_status === "held" && ["confirmed", "in_progress", "completed"].includes(b.status))
    .reduce((s, b) => s + (b.net_amount || 0), 0);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hey, {profile?.display_name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500 mt-1">Here's what's happening with your hustle.</p>
        </div>
        <Link to="/teen/listings" className="flex items-center gap-1 shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Create listing
        </Link>
      </div>

      <InviteCodeCard profile={profile} onUpdated={load} />

      <EarningsSummary
        balance={wallet?.balance || 0}
        week={weekEarned}
        pending={pendingEscrow}
        onCashOut={() => setCashOutOpen(true)}
      />

      {profile && <AvailabilityToggle profile={profile} onChanged={load} />}

      {activeJobs.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            Job in progress
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <div className="space-y-3">
            {activeJobs.map((b) => (
              <div key={b.id} className="space-y-3">
                <BookingCard booking={b} perspective="teen" />
                <AlertParentButton booking={b} />
              </div>
            ))}
          </div>
        </div>
      )}

      <TeenChecklist profile={profile} bookings={bookings} />

      {profile && <ProfileStatsWidget profile={profile} />}

      {pendingApproval.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 mb-3">Waiting on parent approval</h2>
          <div className="space-y-3">
            {pendingApproval.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Upcoming jobs</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">
            {profile?.status === "active"
              ? "No jobs booked yet — publish a service so neighbors can find you."
              : "Once your parent approves your account, you can start taking jobs."}
          </p>
        ) : (
          <UpcomingCalendar bookings={upcoming} />
        )}
      </div>

      <MessagesWidget threads={threads} />

      {cashOutOpen && wallet && (
        <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
      )}
    </div>
    </PullToRefresh>
  );
}