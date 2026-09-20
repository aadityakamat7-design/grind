import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import BookingReceipt from "@/components/grind/BookingReceipt";

// Dialog wrapper for the animated booking receipt. The receipt animation
// re-plays every time the dialog opens because BookingReceipt mounts fresh.
export default function BookingReceiptDialog({ open, onOpenChange, booking, user }) {
  if (!booking) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] p-6 bg-background">
        <DialogTitle className="sr-only">Booking Receipt</DialogTitle>
        <BookingReceipt booking={booking} user={user} />
      </DialogContent>
    </Dialog>
  );
}