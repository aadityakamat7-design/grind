import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Users, ChevronRight, MessageCircle, Wallet } from "lucide-react";
import StatusBadge from "@/components/grind/StatusBadge";
import BookingCard from "@/components/grind/BookingCard";
import EmptyState from "@/components/grind/EmptyState";
import { money } from "@/lib/grind";

export default function ParentDashboard() {
  const { user } = useOutletContext();
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const myLinks = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id, status: "confirmed" });
    const teenIds = myLinks.map((l) => l.teen_user_id);
    let allBookings = [];
    let totalEarn = 0;
    if (teenIds.length) {
      const [b, records] = await Promise.all([
        base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 30),
        base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }),
      ]);
      allBookings = b;
      totalEarn = records.reduce((s, r) => s + (r.net_amount || 0), 0);
    }
    setLinks(myLinks);
    setBookings(allBookings);
    setEarnings(totalEarn);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const pending = bookings.filter((b) => b.status === "pending_parent_approval");
  const active = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Parent dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Full visibility into your teen's activity.</p>
      </div>

      {pending.length > 0 && (
        <Link to="/parent/approvals" className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-sm">{pending.length} booking{pending.length > 1 ? "s" : ""} need{pending.length === 1 ? "s" : ""} your approval</p>
            <p className="text-xs text-amber-700">Review and approve or deny</p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <Wallet className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{money(earnings)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total teen earnings</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <Users className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{links.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Linked teen{links.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-900 mb-3">My teens</h2>
        {links.length === 0 ? (
          <EmptyState icon={Users} title="No linked teens" subtitle="Ask your teen for their parent code and link from onboarding." />
        ) : (
          <div className="space-y-3">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-extrabold text-blue-600">
                  {l.teen_display_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{l.teen_display_name}</p>
                  <StatusBadge status="active" className="mt-1" />
                </div>
                <Link to="/messages" className="text-slate-400 hover:text-blue-600" title="Read messages">
                  <MessageCircle className="w-5 h-5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Active jobs</h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">No active jobs right now.</p>
        ) : (
          <div className="space-y-3">
            {active.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        )}
      </div>
    </div>
  );
}