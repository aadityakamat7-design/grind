import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  XCircle, CalendarClock, MapPin, Tag, Gavel, PauseCircle, PlayCircle,
  StickyNote, MessageSquare, Mail,
} from "lucide-react";
import AdminCancelDialog from "./AdminCancelDialog";
import AdminRescheduleDialog from "./AdminRescheduleDialog";
import AdminAddressDialog from "./AdminAddressDialog";
import AdminPriceDialog from "./AdminPriceDialog";
import AdminResolveDialog from "./AdminResolveDialog";
import AdminPayoutHoldDialog from "./AdminPayoutHoldDialog";
import AdminNoteDialog from "./AdminNoteDialog";
import AdminSystemMessageDialog from "./AdminSystemMessageDialog";
import AdminResendDialog from "./AdminResendDialog";

const CLOSED = ["cancelled", "cancelled_by_admin", "refunded", "abandoned", "denied"];
const RESOLVABLE = ["disputed", "in_progress", "confirmed", "pending_parent_approval"];
const RESCHEDULABLE = ["payment_pending", "pending_parent_approval", "confirmed"];

// The admin action bar for one booking. Each button opens a dialog that asks
// for a reason and shows a summary before anything runs; every action is
// re-validated server-side against the booking's real state.
export default function AdminBookingActions({ booking, onDone }) {
  const [open, setOpen] = useState(null);
  const close = () => setOpen(null);
  const done = (data) => {
    setOpen(null);
    onDone?.(data);
  };

  const closed = CLOSED.includes(booking.status);
  const isOnline = booking.delivery_mode !== "outdoor" || booking.is_physical === false;
  const paidOut = ["released", "releasing"].includes(booking.payment_status);
  const payoutDone = ["transferred", "paid_out"].includes(booking.payout_status);
  const held = booking.payout_hold === true;
  const canHold = held || !payoutDone;

  const props = { booking, onOpenChange: close, onDone: done };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={closed || held}
          onClick={() => setOpen("cancel")}
        >
          <XCircle className="w-4 h-4" /> Cancel booking
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!RESCHEDULABLE.includes(booking.status)}
          onClick={() => setOpen("reschedule")}
        >
          <CalendarClock className="w-4 h-4" /> Reschedule
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={closed || isOnline}
          onClick={() => setOpen("address")}
        >
          <MapPin className="w-4 h-4" /> Change address
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={closed || paidOut || held}
          onClick={() => setOpen("price")}
        >
          <Tag className="w-4 h-4" /> Lower price
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!RESOLVABLE.includes(booking.status) || held}
          onClick={() => setOpen("resolve")}
        >
          <Gavel className="w-4 h-4" /> Resolve / complete
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!canHold}
          onClick={() => setOpen("hold")}
        >
          {held ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
          {held ? "Release payout hold" : "Hold payout"}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => setOpen("note")}>
          <StickyNote className="w-4 h-4" /> Add note
        </Button>

        <Button size="sm" variant="ghost" disabled={closed} onClick={() => setOpen("message")}>
          <MessageSquare className="w-4 h-4" /> Support message
        </Button>

        <Button size="sm" variant="ghost" onClick={() => setOpen("resend")}>
          <Mail className="w-4 h-4" /> Re-send emails
        </Button>
      </div>

      <AdminCancelDialog open={open === "cancel"} {...props} />
      <AdminRescheduleDialog open={open === "reschedule"} {...props} />
      <AdminAddressDialog open={open === "address"} {...props} />
      <AdminPriceDialog open={open === "price"} {...props} />
      <AdminResolveDialog open={open === "resolve"} {...props} />
      <AdminPayoutHoldDialog open={open === "hold"} {...props} />
      <AdminNoteDialog open={open === "note"} {...props} />
      <AdminSystemMessageDialog open={open === "message"} {...props} />
      <AdminResendDialog open={open === "resend"} {...props} />
    </div>
  );
}