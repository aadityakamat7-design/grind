import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, CalendarDays, BarChart3 } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import PageHeader from "@/components/grind/PageHeader";
import AvailabilityToggle from "@/components/grind/AvailabilityToggle";
import AlertParentButton from "@/components/grind/AlertParentButton";
import ConnectBankCard from "@/components/grind/parent/ConnectBankCard";
import InviteCodeCard from "@/components/grind/teen/InviteCodeCard";
import MessagesWidget from "@/components/grind/teen/MessagesWidget";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import TeenStatsGrid from "@/components/grind/teen/TeenStatsGrid";
import TeenHoursCard from "@/components/grind/teen/TeenHoursCard";
import CategoryBreakdown from "@/components/grind/teen/CategoryBreakdown";
import ProfileCompleteness from "@/components/grind/teen/ProfileCompleteness";
import { EarningsAreaChart } from "@/components/grind/TimeRangeChart";
import ErrorRetry from "@/components/grind/ErrorRetry";
import { getOrCreateWallet } from "@/lib/wallet";
import { genInviteCode } from "@/lib/grind";
import PullToRefresh from "@/components/PullToRefresh";

export default function TeenHome() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [records, setRecords] = useState([]);
  const [threads, setThreads] = useState([]);
  const [privateData, setPrivateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [hasParent, setHasParent] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [profiles, myBookings, myListings, w, txns, myThreads, myPrivate] = await Promise.all([
        base44.entities.TeenProfile.filter({ user_id: user.id }),
        base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date", 100),
        base44.entities.Listing.filter({ teen_user_id: user.id }, "-created_date"),
        getOrCreateWallet(user.id),
        base44.entities.EarningsRecord.filter({ teen_user_id: user.id }, "-occurred_at", 200),
        base44.entities.MessageThread.filter({ teen_user_id: user.id }, "-last_message_at", 5),
        base44.entities.TeenPrivateData.filter({ user_id: user.id }),
      ]);
      const links = await base44.entities.ParentTeenLink.filter({ teen_user_id: user.id, status: "confirmed" });
      setHasParent(links.length > 0);
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
      setProfile(p);
      setBookings(myBookings);
      setListings(myListings);
      setWallet(w);
      setRecords(txns);
      setThreads(myThreads);
      setPrivateData(myPrivate[0] || null);
    } catch (err) {
      console.error("TeenHome load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubBooking = base44.entities.Booking.subscribe(() => load());
    const unsubEarn = base44.entities.EarningsRecord.subscribe(() => load());
    return () => { unsubBooking(); unsubEarn(); };
  }, [load]);

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

  const activeJobs = bookings.filter((b) => b.status === "in_progress");
  const upcoming = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
  const pendingApproval = bookings.filter((b) => b.status === "pending_parent_approval");
  const unreadCount = threads.filter((t) => !t.last_read_by_teen).length;

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <PageHeader title={`Hey, ${profile?.display_name?.split(" ")[0] || "there"} 👋`} subtitle="Here's what's happening with your hustle.">
          <Link to="/teen/listings" className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-4 h-10 shadow-soft hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New service
          </Link>
        </PageHeader>

        <TeenStatsGrid records={records} bookings={bookings} profile={profile} />

        <TeenHoursCard profile={profile} privateData={privateData} bookings={bookings} />

        <div>
          <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-[18px] h-[18px] text-muted-foreground" /> Earnings over time
          </h2>
          <EarningsAreaChart data={records} valueKey="net_amount" dateKey="occurred_at" color="#2E6BE0" height={180} />
        </div>

        <CategoryBreakdown bookings={bookings} listings={listings} />

        <ProfileCompleteness profile={profile} />

        {profile?.status === "active" && !hasParent && (
          <ConnectBankCard
            profile={profile}
            identityVerified={profile?.identity_status === "verified"}
            returnPath="/teen"
            onUpdated={load}
          />
        )}

        <InviteCodeCard profile={profile} onUpdated={load} />

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
              {profile?.status === "active" && (
                <Link to="/teen/listings" className="inline-flex items-center gap-1.5 mt-4 bg-primary text-primary-foreground text-[13px] font-semibold rounded-full px-5 h-10 shadow-soft hover:opacity-90 transition-opacity">
                  <Plus className="w-4 h-4" /> Create a service
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
            </div>
          )}
        </section>

        <MessagesWidget threads={threads} unreadCount={unreadCount} />

        {cashOutOpen && wallet && (
          <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
        )}
      </div>
    </PullToRefresh>
  );
}