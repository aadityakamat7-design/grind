import React, { useState, useMemo } from "react";
import { Search, AlertTriangle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

const STATUS_OPTIONS = ["all", "payment_pending", "pending_parent_approval", "confirmed", "in_progress", "completed", "disputed", "cancelled", "denied", "abandoned"];

export default function AdminBookings({ bookings, listings }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const listingMap = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listsings] ?? [listings]);

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

  const timeline = (b) => {
    const steps = [
      { label: "Created", date: b.created_date, done: true },
      { label: "Payment held", date: b.payment_status === "held" || b.payment_status === "released" || b.payment_status === "releasing" ? b.created_date : null, done: ["held", "released", "releasing", "refunded"].includes(b.payment_status) },
      { label: "Parent approved", date: b.parent_started_at || (["confirmed", "in_progress", "completed"].includes(b.status) ? b.created_date : null), done: ["confirmed", "in_progress", "completed"].includes(b.status) },
      { label: "Job started", date: b.teen_started_at, done: ["in_progress", "completed"].includes(b.status) },
      { label: "Job completed", date: b.teen_finished_at, done: b.status === "completed" },
      { label: "Payment released", date: b.released_at, done: b.payment_status === "released" },
      { label: "Refunded", date: b.payment_status === "refunded" ? b.updated_date : null, done: b.payment_status === "refunded" },
    ];
    return steps;
  };

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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.listing_title}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status" value={<StatusBadge status={selected.status} />} />
                  <Field label="Payment" value={<StatusBadge status={selected.payment_status} />} />
                  <Field label="Teen" value={selected.teen_display_name} />
                  <Field label="Neighbor" value={selected.buyer_name} />
                  <Field label="Scheduled" value={selected.scheduled_start ? new Date(selected.scheduled_start).toLocaleString() : "—"} />
                  <Field label="Delivery" value={selected.delivery_mode} />
                </div>

                <div className="grid grid-cols-2 gap-3 bg-secondary rounded-xl p-3">
                  <Field label="Price total" value={money(selected.price_total || 0)} />
                  <Field label="Charge amount" value={money(selected.charge_amount || 0)} />
                  <Field label="Platform fee" value={money(selected.platform_fee || 0)} />
                  <Field label="Net to teen" value={money(selected.net_amount || 0)} />
                  <Field label="Tip" value={money(selected.tip_amount || 0)} />
                  <Field label="Payout status" value={selected.payout_status} />
                </div>

                <div>
                  <p className="font-bold text-foreground mb-2">Timeline</p>
                  <div className="space-y-2.5">
                    {timeline(selected).map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${step.done ? "bg-primary" : "bg-border"}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                          {step.date && <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selected.dispute_reason && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <p className="font-bold text-rose-800 text-xs mb-1">Dispute reason</p>
                    <p className="text-sm text-rose-700">{selected.dispute_reason}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground break-all">
                  <p><span className="font-semibold">Booking ID:</span> {selected.id}</p>
                  {selected.stripe_payment_intent_id && <p><span className="font-semibold">Stripe PI:</span> {selected.stripe_payment_intent_id}</p>}
                  {selected.stripe_transfer_id && <p><span className="font-semibold">Stripe transfer:</span> {selected.stripe_transfer_id}</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{value ?? "—"}</div>
    </div>
  );
}