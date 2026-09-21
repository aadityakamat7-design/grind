import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import BookingReceiptDialog from "@/components/grind/BookingReceiptDialog";

// Demo booking that simulates a completed payment.
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

export default function ReceiptPreviewCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-[15px] font-bold text-foreground">Receipt preview</h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Simulate a buyer payment to see the confirmation receipt animation.
        </p>
      </div>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <CreditCard className="w-4 h-4" /> Fake buy
      </Button>

      <BookingReceiptDialog
        open={open}
        onOpenChange={setOpen}
        booking={SAMPLE_BOOKING}
        user={SAMPLE_USER_BUYER}
      />
    </div>
  );
}