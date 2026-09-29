import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, MESSAGE_REASONS } from "@/lib/adminApi";

// Posts a message into the booking's existing thread, labelled "Blockwork
// Support", so guidance lands where the parties actually read it.
export default function AdminSystemMessageDialog({ booking, open, onOpenChange, onDone }) {
  const [message, setMessage] = useState("");

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send a Blockwork Support message"
      description={`"${booking.listing_title}"`}
      reasons={MESSAGE_REASONS}
      confirmLabel="Send message"
      blockConfirm={!message.trim()}
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Message" value={message} />
          <Line label="Appears as" value="Blockwork Support" />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminSendSystemMessage", {
          bookingId: booking.id,
          message: message.trim(),
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="system-message">Message</Label>
        <Textarea
          id="system-message"
          className="rounded-xl"
          rows={4}
          placeholder="This will appear in the booking's message thread."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Shown in the thread the neighbor, teen and parent already use. Contact details
          are automatically masked.
        </p>
      </div>
    </AdminActionDialog>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}