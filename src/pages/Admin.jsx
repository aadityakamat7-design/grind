import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Search, CalendarDays, Wallet, Flag, BadgeCheck } from "lucide-react";
import MetricCard from "@/components/grind/admin/MetricCard";
import ReportRow from "@/components/grind/admin/ReportRow";
import PayoutReviewQueue from "@/components/grind/admin/PayoutReviewQueue";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

export default function Admin() {
  const [teens, setTeens] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    const [t, b, bk, r] = await Promise.all([
      base44.entities.TeenProfile.list("-created_date", 200),
      base44.entities.BuyerProfile.list("-created_date", 200),
      base44.entities.Booking.list("-created_date", 200),
      base44.entities.Report.list("-created_date", 100),
    ]);
    setTeens(t);
    setBuyers(b);
    setBookings(bk);
    setReports(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (report) => {
    setActing(true);
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const gmv = bookings
    .filter((b) => !["cancelled", "denied"].includes(b.status))
    .reduce((s, b) => s + (b.price_total || 0), 0);
  const openReports = reports.filter((r) => r.status === "open");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Admin console</h1>
        <p className="text-sm text-slate-500 mt-1">Marketplace health, moderation, and verifications.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={Users} label="Teens" value={teens.length} />
        <MetricCard icon={Search} label="Neighbors" value={buyers.length} accent="text-sky-500" />
        <MetricCard icon={CalendarDays} label="Bookings" value={bookings.length} accent="text-emerald-500" />
        <MetricCard icon={Wallet} label="GMV" value={money(gmv)} accent="text-amber-500" />
      </div>

      <PayoutReviewQueue bookings={bookings} onDone={load} />

      <div>
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-500" /> Reports {openReports.length > 0 && `(${openReports.length} open)`}
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">No reports filed.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => <ReportRow key={r.id} report={r} onResolve={resolve} acting={acting} />)}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-blue-500" /> Neighbor verifications
        </h2>
        {buyers.length === 0 ? (
          <p className="text-sm text-slate-400">No neighbors yet.</p>
        ) : (
          <div className="space-y-2.5">
            {buyers.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{b.full_name || "Neighbor"}</p>
                  <p className="text-xs text-slate-500">ZIP {b.zip || "—"}</p>
                </div>
                <StatusBadge status={b.id_verification_status === "verified" ? "active" : "pending"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}