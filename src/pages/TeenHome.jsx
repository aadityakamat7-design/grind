import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Wallet, CalendarDays, ShieldAlert, Copy, Check, Sparkles } from "lucide-react";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import { money } from "@/lib/grind";

export default function TeenHome() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [profiles, myBookings, records] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: user.id }),
      base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date", 20),
      base44.entities.EarningsRecord.filter({ teen_user_id: user.id }),
    ]);
    setProfile(profiles[0] || null);
    setBookings(myBookings);
    setEarnings(records.reduce((s, r) => s + (r.net_amount || 0), 0));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" /></div>;

  const upcoming = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
  const pendingApproval = bookings.filter((b) => b.status === "pending_parent_approval");

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Hey, {profile?.display_name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">Here's what's happening with your hustle.</p>
      </div>

      {profile?.status === "pending_parent" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-sm">Waiting for your parent</p>
              <p className="text-xs text-amber-700 mt-1">
                Your services can't go live until a parent links to your account with your code:
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="font-extrabold tracking-[0.25em] text-amber-900 bg-white rounded-lg px-3 py-1.5 text-sm border border-amber-200">
                  {profile.invite_code}
                </span>
                <button onClick={copyCode} className="text-amber-700 hover:text-amber-900">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-violet-100">
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-2xl font-extrabold mt-2">{money(earnings)}</p>
          <p className="text-xs opacity-80 mt-0.5">Total earned</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <CalendarDays className="w-5 h-5 text-violet-500" />
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{upcoming.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Upcoming jobs</p>
        </div>
      </div>

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
          <EmptyState
            icon={Sparkles}
            title="No jobs yet"
            subtitle={profile?.status === "active" ? "Publish a service so neighbors can find you." : "Once your parent approves your account, you can start taking jobs."}
            action={profile?.status === "active" && (
              <Link to="/teen/listings" className="text-sm font-bold text-violet-600 hover:text-violet-700">
                Create a service →
              </Link>
            )}
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        )}
      </div>
    </div>
  );
}