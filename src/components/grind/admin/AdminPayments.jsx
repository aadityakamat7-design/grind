import React, { useState, useMemo } from "react";
import { Search, AlertTriangle, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/grind/StatusBadge";
import PayoutReviewQueue from "@/components/grind/admin/PayoutReviewQueue";
import { money } from "@/lib/grind";

export default function AdminPayments({ bookings, user, onReload }) {
  const [tab, setTab] = useState("payouts");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // Stripe reconciliation: bookings with payment data vs. expected state
  const reconciled = useMemo(() => bookings.map((b) => {
    const hasPI = !!b.stripe_payment_intent_id;
    const hasTransfer = !!b.stripe_transfer_id;
    const isPaid = ["held", "released", "releasing", "refunded"].includes(b.payment_status);
    const isReleased = b.payment_status === "released";
    const isRefunded = b.payment_status === "refunded";
    const mismatch = (isPaid && !hasPI) || (isReleased && !hasTransfer);
    return { ...b, hasPI, hasTransfer, mismatch };
  }), [bookings]);

  const mismatches = reconciled.filter((b) => b.mismatch);

  // Refund history
  const refunds = useMemo(() => bookings.filter((b) => b.payment_status === "refunded" || b.status === "denied" || b.status === "cancelled").sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)), [bookings]);

  const filteredRecon = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reconciled.filter((b) => !q || (b.listing_title || "").toLowerCase().includes(q) || (b.id || "").toLowerCase().includes(q) || (b.stripe_payment_intent_id || "").toLowerCase().includes(q));
  }, [reconciled, query]);

  const filteredRefunds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return refunds.filter((b) => !q || (b.listing_title || "").toLowerCase().includes(q) || (b.buyer_name || "").toLowerCase().includes(q));
  }, [refunds, query]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <TabButton active={tab === "payouts"} onClick={() => setTab("payouts")}>Payout review</TabButton>
        <TabButton active={tab === "recon"} onClick={() => setTab("recon")}>Stripe reconciliation {mismatches.length > 0 && <span className="ml-1 text-destructive">({mismatches.length})</span>}</TabButton>
        <TabButton active={tab === "refunds"} onClick={() => setTab("refunds")}>Refund history ({refunds.length})</TabButton>
      </div>

      {tab === "payouts" && <PayoutReviewQueue bookings={bookings} onDone={onReload} user={user} />}

      {tab === "recon" && (
        <div className="space-y-3">
          {mismatches.length > 0 && (
            <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive text-sm">{mismatches.length} reconciliation mismatch{mismatches.length > 1 ? "es" : ""}</p>
                <p className="text-xs text-destructive/80 mt-0.5">Bookings with a payment status but missing Stripe IDs — investigate manually.</p>
              </div>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="rounded-xl pl-9" placeholder="Search by title, booking ID, or Stripe PI…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Job</th>
                    <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Payment</th>
                    <th className="text-left font-semibold px-4 py-3">Stripe PI</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Transfer</th>
                    <th className="text-right font-semibold px-4 py-3">Amount</th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecon.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(b)}>
                      <td className="px-4 py-3 font-semibold text-foreground truncate max-w-[160px]">{b.listing_title}</td>
                      <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={b.payment_status} /></td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground truncate max-w-[120px]">{b.stripe_payment_intent_id ? `…${b.stripe_payment_intent_id.slice(-12)}` : <span className="text-destructive">missing</span>}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-muted-foreground truncate max-w-[120px]">{b.stripe_transfer_id ? `…${b.stripe_transfer_id.slice(-12)}` : (b.payment_status === "released" ? <span className="text-destructive">missing</span> : "—")}</td>
                      <td className="px-4 py-3 text-right font-semibold">{money(b.price_total || 0)}</td>
                      <td className="px-4 py-3 text-center">{b.mismatch ? <AlertTriangle className="w-4 h-4 text-destructive mx-auto" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRecon.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No bookings.</p>}
          </div>
        </div>
      )}

      {tab === "refunds" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="rounded-xl pl-9" placeholder="Search refunds…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Job</th>
                    <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Neighbor</th>
                    <th className="text-left font-semibold px-4 py-3">Reason</th>
                    <th className="text-right font-semibold px-4 py-3">Amount</th>
                    <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRefunds.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(b)}>
                      <td className="px-4 py-3 font-semibold text-foreground truncate max-w-[160px]">{b.listing_title}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[120px]">{b.buyer_name}</td>
                      <td className="px-4 py-3 text-xs">
                        {b.status === "denied" ? "Parent denied" : b.status === "cancelled" ? "Cancelled" : b.status === "disputed" ? "Disputed" : "Refunded"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{money(b.charge_amount || b.price_total || 0)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{b.updated_date ? new Date(b.updated_date).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRefunds.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No refunds.</p>}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.listing_title}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3 bg-secondary rounded-xl p-3">
                  <Field label="Payment status" value={selected.payment_status} />
                  <Field label="Payout status" value={selected.payout_status} />
                  <Field label="Charge" value={money(selected.charge_amount || 0)} />
                  <Field label="Platform fee" value={money(selected.platform_fee || 0)} />
                  <Field label="Net" value={money(selected.net_amount || 0)} />
                  <Field label="Tip" value={money(selected.tip_amount || 0)} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-semibold">Stripe PI:</span> {selected.stripe_payment_intent_id || "—"}</p>
                  <p><span className="font-semibold">Stripe transfer:</span> {selected.stripe_transfer_id || "—"}</p>
                  <p><span className="font-semibold">Booking ID:</span> {selected.id}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}

function Field({ label, value }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium text-foreground">{value ?? "—"}</p></div>;
}