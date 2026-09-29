import React, { useState, useMemo } from "react";
import { Search, AlertTriangle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";
import AdminBookingDetail from "./AdminBookingDetail";

const STATUS_OPTIONS = ["all", "payment_pending", "pending_parent_approval", "confirmed", "in_progress", "completed", "disputed", "cancelled", "cancelled_by_admin", "refunded", "denied", "abandoned"];

export default function AdminBookings({ bookings, reports, onReload }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (b.listing_title || "").toLowerCase().includes(q) || (b.teen_display_name || "").toLowerCase().includes(q) || (b.buyer_name || "").toLowerCase().includes(q) || (b.id || "").toLowerCase().includes(q);
    });
  }, [bookings, query, statusFilter]);

  // Anomaly detection
  const now = Date.now();
  const isStuckApproval = (b) => b.status === "pending_parent_approval" && b.created_date && (now - new Date(b.created_date).getTime()) > 48 * 3600000;
  const isStuckPayment = (b) => b.status === "payment_pending" && b.created_date && (now - new Date(b.created_date).getTime()) > 30 * 60000;
  const isAbandoned = (b) => b.status === "abandoned" || isStuckPayment(b);

  const anomalies = bookings.filter((b) => isStuckApproval(b) || isStuckPayment(b));

  return (
    <div className="space-y-4">
      {anomalies.length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">{anomalies.length} booking anomaly{anomalies.length > 1 ? "ies" : ""} detected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {bookings.filter(isStuckApproval).length} stuck in approval &gt;48h · {bookings.filter(isStuckPayment).length} stuck in payment &gt;30min
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="rounded-xl pl-9" placeholder="Search by title, teen, buyer, or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Job</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Teen</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Neighbor</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-right font-semibold px-4 py-3 hidden sm:table-cell">Total</th>
                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(b)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(isStuckApproval(b) || isStuckPayment(b)) && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span className="font-semibold text-foreground truncate max-w-[180px]">{b.listing_title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[120px]">{b.teen_display_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[120px]">{b.buyer_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell">{money(b.price_total || 0)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{b.created_date ? new Date(b.created_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right"><ArrowRight className="w-4 h-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No bookings match your filters.</p>}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {bookings.length} bookings</p>

      <AdminBookingDetail
        booking={selected}
        reports={reports}
        onClose={() => setSelected(null)}
        onReload={onReload}
      />
    </div>
  );
}