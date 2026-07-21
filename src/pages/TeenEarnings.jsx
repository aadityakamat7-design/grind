import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wallet, Download, Info, Clock } from "lucide-react";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import EmptyState from "@/components/grind/EmptyState";
import { money } from "@/lib/grind";

export default function TeenEarnings() {
  const { user } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [held, setHeld] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [data, heldBookings] = await Promise.all([
      base44.entities.EarningsRecord.filter({ teen_user_id: user.id }, "-occurred_at"),
      base44.entities.Booking.filter({ teen_user_id: user.id, payment_status: "held" }),
    ]);
    setRecords(data);
    setHeld(heldBookings.reduce((s, b) => s + (b.net_amount || b.price_total || 0), 0));
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const total = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const byMonth = {};
  records.forEach((r) => {
    if (!r.occurred_at) return;
    const k = format(new Date(r.occurred_at), "MMM yy");
    byMonth[k] = (byMonth[k] || 0) + (r.net_amount || 0);
  });
  const chartData = Object.entries(byMonth)
    .slice(0, 6)
    .reverse()
    .map(([month, net]) => ({ month, net: Math.round(net * 100) / 100 }));
  const thisYear = new Date().getFullYear();
  const yearTotal = records.filter((r) => r.tax_year === thisYear).reduce((s, r) => s + (r.net_amount || 0), 0);

  const exportCsv = () => {
    const rows = [
      ["Date", "Job", "Neighbor", "Gross", "Net"],
      ...records.map((r) => [
        r.occurred_at ? format(new Date(r.occurred_at), "yyyy-MM-dd") : "",
        r.listing_title || "",
        r.buyer_name || "",
        r.amount,
        r.net_amount,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kickstart-earnings-${thisYear}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Earnings</h1>
        {records.length > 0 && (
          <Button variant="outline" className="rounded-xl" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        )}
      </div>

      <div className="bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <p className="text-sm opacity-80">Total earned</p>
        <p className="text-4xl font-extrabold mt-1">{money(total)}</p>
        <p className="text-xs opacity-70 mt-2">{money(yearTotal)} earned in {thisYear}</p>
      </div>

      {held > 0 && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-bold text-slate-900 text-sm">In escrow</p>
              <p className="text-xs text-slate-500">Released to your wallet when the job is done</p>
            </div>
          </div>
          <p className="font-extrabold text-amber-600">{money(held)}</p>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Earnings by month</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => money(v)} cursor={{ fill: "#eff6ff" }} />
                <Bar dataKey="net" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {yearTotal >= 400 && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          You've earned over $400 this year — self-employment earnings at this level generally need to be reported on a tax return. Talk it over with your parent.
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState icon={Wallet} title="Nothing earned yet" subtitle="Complete your first job and your earnings will show up here." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div>
                <p className="font-bold text-slate-900 text-sm">{r.listing_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.buyer_name} · {r.occurred_at ? format(new Date(r.occurred_at), "MMM d, yyyy") : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-emerald-600">+{money(r.net_amount)}</p>
                <p className="text-[11px] text-slate-400">{money(r.amount)} gross</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}