import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { money } from "@/lib/grind";

// Shows what the app recorded for one booking next to what Stripe actually
// holds, so support can see a disagreement instead of guessing.
export default function AdminPaymentLiveCheck({ data, onClose }) {
  if (!data) return null;
  const { row, live, problems, testMode } = data;
  const clean = problems.length === 0;

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stripe check — {row.title || "Booking"}</DialogTitle>
          <DialogDescription>
            Booking {row.booking_id}
            {testMode ? " · checked against Stripe test mode" : ""}
          </DialogDescription>
        </DialogHeader>

        <div
          className={`flex items-start gap-2.5 rounded-2xl p-3 border ${
            clean ? "bg-emerald-50 border-emerald-200" : "bg-destructive/10 border-destructive/20"
          }`}
        >
          {clean
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
          <div>
            <p className={`font-bold text-sm ${clean ? "text-emerald-800" : "text-destructive"}`}>
              {clean ? "The records agree with Stripe" : `${problems.length} issue${problems.length > 1 ? "s" : ""} found`}
            </p>
            {!clean && (
              <ul className="mt-1.5 space-y-1">
                {problems.map((p, i) => (
                  <li key={i} className="text-xs text-destructive/90">• {p}</li>
                ))}
              </ul>
            )}
            {live.synthetic && (
              <p className="text-xs text-muted-foreground mt-1">
                This was a sub-minimum charge the app settled without Stripe, so there is no payment object to compare.
              </p>
            )}
            {live.otherMode && (
              <p className="text-xs text-muted-foreground mt-1">
                This booking was taken while Stripe was in {live.otherMode} mode, so it isn't in the account
                connected right now — there is nothing to compare it against.
              </p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Panel title="What Blockwork recorded">
            <Field label="Payment status" value={String(row.payment_status || "—").replace(/_/g, " ")} />
            <Field label="Booking status" value={String(row.booking_status || "—").replace(/_/g, " ")} />
            <Field label="Payout status" value={String(row.payout_status || "—").replace(/_/g, " ")} />
            <Field label="Charged" value={money(row.charge_amount)} />
            <Field label="Refunded" value={money(row.admin_refund_amount)} />
            <Field label="Platform fee" value={money(row.platform_fee)} />
            <Field label="Net to teen" value={money(row.net_amount)} />
            <Field label="Tip" value={money(row.tip_amount)} />
            {row.payout_hold && <Field label="Payout hold" value="On" />}
          </Panel>

          <Panel title="What Stripe holds">
            {live.payment_intent ? (
              <>
                <Field label="Payment status" value={live.payment_intent.status} />
                <Field label="Amount received" value={money(live.payment_intent.amount_received)} />
                <Field label="Amount" value={money(live.payment_intent.amount)} />
                {live.charged_total !== undefined && <Field label="Charged" value={money(live.charged_total)} />}
                {live.refunds_total !== undefined && <Field label="Refunded" value={money(live.refunds_total)} />}
                <Field label="Live or test" value={live.payment_intent.livemode ? "Live" : "Test"} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {live.error ? `Could not reach Stripe: ${live.error}` : "No Stripe payment is attached to this booking."}
              </p>
            )}

            {live.transfer && (
              <>
                <Field label="Transfer to teen" value={money(live.transfer.amount)} />
                {live.transfer.reversed && <Field label="Transfer" value="Reversed" />}
              </>
            )}
            {live.transfer_error && <Field label="Transfer lookup" value={live.transfer_error} />}
            {live.tip_payment_intent && (
              <Field label="Tip charge" value={`${money(live.tip_payment_intent.amount)} · ${live.tip_payment_intent.status}`} />
            )}
            {live.tip_error && <Field label="Tip lookup" value={live.tip_error} />}
          </Panel>
        </div>

        {live.refunds.length > 0 && (
          <div>
            <p className="font-bold text-foreground text-sm mb-2">Refunds in Stripe</p>
            <div className="space-y-1.5">
              {live.refunds.map((r) => (
                <div key={r.id} className="bg-secondary rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{money(r.amount)} · {r.status}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {r.created ? new Date(r.created).toLocaleString() : ""} {r.reason ? `· ${r.reason}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground space-y-1">
          <p className="flex items-center gap-1.5">
            <span className="font-semibold">Stripe payment intent:</span>
            <span className="font-mono break-all">{row.payment_intent_id || "—"}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="font-semibold">Stripe transfer:</span>
            <span className="font-mono break-all">{row.transfer_id || "—"}</span>
          </p>
          <p className="flex items-center gap-1 text-muted-foreground/80">
            <ExternalLink className="w-3 h-3" /> Full objects are in the Stripe dashboard.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Panel({ title, children }) {
  return (
    <div className="border border-border rounded-xl p-3 space-y-1.5">
      <p className="font-bold text-foreground text-xs">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground break-words">{value ?? "—"}</p>
    </div>
  );
}