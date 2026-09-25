import React, { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Download, Copy, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { CATEGORY_LABELS } from "@/lib/grind";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Generates a visual barcode from the booking ID — not a real scannable
// barcode, but a deterministic pattern of vertical bars that looks like one.
function Barcode({ value }) {
  const bars = React.useMemo(() => {
    const chars = (value || "").replace(/[^a-zA-Z0-9]/g, "").split("");
    const result = [];
    // Start guard
    result.push({ w: 2, dark: true });
    result.push({ w: 1, dark: false });
    for (const ch of chars) {
      const code = ch.charCodeAt(0);
      result.push({ w: (code % 3) + 1, dark: true });
      result.push({ w: (code % 2) + 1, dark: false });
    }
    // End guard
    result.push({ w: 2, dark: true });
    result.push({ w: 1, dark: false });
    result.push({ w: 2, dark: true });
    return result;
  }, [value]);

  return (
    <div className="flex items-end justify-center gap-[1px] h-10 py-1">
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: `${bar.w * 2}px`,
            height: "100%",
            backgroundColor: bar.dark ? "hsl(var(--foreground))" : "transparent",
          }}
        />
      ))}
    </div>
  );
}

// Role-aware receipt — buyer sees what they paid (gross, fee, tip, total);
// teen/parent sees net earnings (net + tip net), never the gross price.
export default function BookingReceipt({ booking, user }) {
  const [copied, setCopied] = useState(false);
  const isBuyer = user?.id === booking.buyer_user_id;
  const isTeen = user?.id === booking.teen_user_id;
  const isParent = user?.id === booking.parent_user_id;
  const isEarningSide = isTeen || isParent;

  const paidDate = booking.released_at || booking.transferred_at || booking.created_date;
  const categoryLabel = CATEGORY_LABELS?.[booking.category] || booking.category || "—";
  const bookingIdShort = (booking.id || "").substring(0, 12).toUpperCase();
  // Only show the PAID stamp when a real Stripe payment was captured —
  // payment_status must be held, releasing, or released. Never for unpaid
  // or payment_failed bookings (no money was ever captured).
  const isPaid = ["held", "releasing", "released"].includes(booking.payment_status);

  const handleCopy = () => {
    navigator.clipboard?.writeText(booking.id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: [320, 480] });
    const left = 24;
    let y = 30;

    doc.setFont("courier", "bold");
    doc.setFontSize(14);
    doc.text("BLOCKWORK", left, y);
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.text("Booking Receipt", left + 110, y);
    y += 8;
    doc.setLineDashPattern([2, 2], 0);
    doc.line(left, y, 296, y);
    doc.setLineDashPattern([], 0);
    y += 16;

    doc.setFontSize(7);
    doc.text(`Booking ID: ${booking.id}`, left, y);
    y += 12;

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text(isEarningSide ? "EARNINGS RECEIPT" : "PAYMENT RECEIPT", left, y);
    y += 16;

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.text(`Buyer:    ${booking.buyer_name || "—"}`, left, y); y += 12;
    doc.text(`Teen:     ${booking.teen_display_name || "—"}`, left, y); y += 12;
    doc.text(`Category: ${categoryLabel}`, left, y); y += 12;
    if (booking.scheduled_start) {
      doc.text(`Date:     ${format(new Date(booking.scheduled_start), "MMM d, yyyy h:mm a")}`, left, y);
      y += 12;
    }
    y += 6;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(left, y, 296, y);
    doc.setLineDashPattern([], 0);
    y += 16;

    if (isEarningSide) {
      doc.text(`Net earnings:     ${money(booking.net_amount || 0)}`, left, y); y += 12;
      if (booking.tip_amount > 0) {
        doc.text(`Tip received:     ${money(booking.tip_amount || 0)}`, left, y); y += 12;
      }
      doc.setFont("courier", "bold");
      doc.text(`Total to receive:  ${money((booking.net_amount || 0) + (booking.tip_amount || 0))}`, left, y); y += 12;
    } else {
      doc.text(`Job price:         ${money(booking.price_total || 0)}`, left, y); y += 12;
      doc.text(`Platform fee:      ${money(booking.platform_fee || 0)}`, left, y); y += 12;
      if (booking.tip_amount > 0) {
        doc.text(`Tip:               ${money(booking.tip_amount || 0)}`, left, y); y += 12;
      }
      doc.setFont("courier", "bold");
      doc.text(`Total paid:        ${money(booking.charge_amount || booking.price_total || 0)}`, left, y); y += 12;
    }
    y += 10;

    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    doc.setTextColor(200, 30, 30);
    if (isPaid) {
      doc.text("PAID", left + 200, y);
    }
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    if (paidDate) {
      doc.text(format(new Date(paidDate), "MMM d, yyyy"), left + 200, y + 10);
    }
    doc.setTextColor(0, 0, 0);
    y += 24;

    doc.setLineDashPattern([2, 2], 0);
    doc.line(left, y, 296, y);
    doc.setLineDashPattern([], 0);
    y += 16;

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for using Blockwork", left, y);

    doc.save(`blockwork-receipt-${bookingIdShort}.pdf`);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Printer graphic */}
      <div className="relative z-10 w-32 h-16 bg-card border border-border rounded-t-2xl shadow-card flex items-center justify-center">
        <Printer className="w-7 h-7 text-muted-foreground" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-border rounded-b-2xl" />
      </div>

      {/* Receipt — slides out from behind the printer */}
      <motion.div
        initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
        animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="w-full max-w-[340px] -mt-2 bg-background border border-border rounded-b-2xl shadow-card overflow-hidden"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <div className="p-5 text-foreground">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-border">
            <p className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              Blockwork
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              {isEarningSide ? "Earnings Receipt" : "Booking Receipt"}
            </p>
          </div>

          {/* Barcode */}
          <div className="py-3 border-b border-dashed border-border">
            <Barcode value={booking.id} />
            <p className="text-[9px] text-center text-muted-foreground mt-1 tracking-wider">
              {bookingIdShort}
            </p>
          </div>

          {/* Booking details */}
          <div className="py-3 space-y-1.5 text-[11px] border-b border-dashed border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer</span>
              <span className="font-medium">{booking.buyer_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teen</span>
              <span className="font-medium">{booking.teen_display_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{categoryLabel}</span>
            </div>
            {booking.scheduled_start && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-right">
                  {format(new Date(booking.scheduled_start), "MMM d, yyyy · h:mm a")}
                </span>
              </div>
            )}
          </div>

          {/* Price breakdown */}
          <div className="py-3 space-y-1.5 text-[11px] border-b border-dashed border-border">
            {isEarningSide ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net earnings</span>
                  <span className="font-medium">{money(booking.net_amount || 0)}</span>
                </div>
                {booking.tip_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tip received</span>
                    <span className="font-medium">{money(booking.tip_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-dashed border-border">
                  <span className="font-bold">Total to receive</span>
                  <span className="font-bold">{money((booking.net_amount || 0) + (booking.tip_amount || 0))}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Job price</span>
                  <span className="font-medium">{money(booking.price_total || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee (12.9% + $0.30)</span>
                  <span className="font-medium">{money(booking.platform_fee || 0)}</span>
                </div>
                {booking.tip_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tip</span>
                    <span className="font-medium">{money(booking.tip_amount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-dashed border-border">
                  <span className="font-bold">Total paid</span>
                  <span className="font-bold">{money(booking.charge_amount || booking.price_total || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* PAID stamp + thank you */}
          <div className="pt-3 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Thank you for using Blockwork</p>
            <div className="flex flex-col items-end">
              {isPaid && (
              <span
                className="text-sm font-bold tracking-wider px-2 py-0.5 border-2 rounded-md"
                style={{
                  color: "hsl(4 72% 50%)",
                  borderColor: "hsl(4 72% 50%)",
                  transform: "rotate(-8deg)",
                  opacity: 0.85,
                }}
              >
                PAID
              </span>
              )}
              {paidDate && (
                <span className="text-[8px] text-muted-foreground mt-1">
                  {format(new Date(paidDate), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Perforation edge */}
        <div
          className="h-3"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "8px 6px",
          }}
        />
      </motion.div>

      {/* Confirmation line + actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        className="w-full max-w-[340px] mt-5 space-y-3"
      >
        <p className="text-sm font-medium text-center text-foreground">
          {isPaid
            ? (isEarningSide ? "Booking confirmed — your earnings are locked in" : "Payment successful — you're all set")
            : "Booking created — complete your payment to confirm"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-full" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4" /> Receipt
          </Button>
          <Button variant="outline" className="rounded-full" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy ID"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}