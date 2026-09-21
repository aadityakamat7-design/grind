import React, { useState, useEffect } from "react";
import { Receipt, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingReceiptDialog from "@/components/grind/BookingReceiptDialog";

// Demo booking data that shows what the receipt looks like after a
// real payment. Two views: buyer (what they paid) and teen (what they earned).
const SAMPLE_BOOKING = {
  id: "bk_8f3a2c1d9e7b4a60",
  listing_title: "Lawn mowing — front + back yard",
  category: "lawn_care",
  buyer_name: "Sarah Mitchell",
  teen_display_name: "Jake R.",
  scheduled_start: new Date(Date.now() + 2 * 86400000).toISOString(),
  price_total: 45.0,
  platform_fee: 6.11,
  net_amount: 38.89,
  tip_amount: 5.0,
  charge_amount: 50.0,
  released_at: new Date().toISOString(),
  status: "confirmed",
  payment_status: "held",
};

const SAMPLE_USER_BUYER = { id: "demo-buyer" };
const SAMPLE_USER_TEEN = { id: SAMPLE_BOOKING.teen_user_id };

export default function ReceiptPreviewCard({ adminEmail }) {
  const [view, setView] = useState(null); // null | "buyer" | "teen"

  // Auto-play the buyer receipt animation when the card mounts
  useEffect(() => {
    const t = setTimeout(() => setView("buyer"), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Receipt className="w-5 h-5 text-primary" />
        <h3 className="text-[15px] font-bold text-foreground">Receipt preview</h3>
      </div>
      <p className="text-[13px] text-muted-foreground mb-4">
        See what the booking confirmation receipt looks like after a neighbor pays.
        The buyer sees what they paid; the teen sees their net earnings.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="rounded-full" onClick={() => setView("buyer")}>
          <Eye className="w-4 h-4" /> Buyer view
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => setView("teen")}>
          <Eye className="w-4 h-4" /> Teen view
        </Button>
      </div>

      <BookingReceiptDialog
        open={view === "buyer"}
        onOpenChange={(o) => !o && setView(null)}
        booking={SAMPLE_BOOKING}
        user={SAMPLE_USER_BUYER}
      />
      <BookingReceiptDialog
        open={view === "teen"}
        onOpenChange={(o) => !o && setView(null)}
        booking={SAMPLE_BOOKING}
        user={SAMPLE_USER_TEEN}
      />
    </div>
  );
}