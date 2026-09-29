import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, NOTE_REASONS } from "@/lib/adminApi";

// Internal note on a booking. Admins only — the parties are never notified and
// never see it. Notes are append-only, so an earlier one is never overwritten.
export default function AdminNoteDialog({ booking, open, onOpenChange, onDone }) {
  const [note, setNote] = useState("");

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add an internal note"
      description={`"${booking.listing_title}"`}
      reasons={NOTE_REASONS}
      confirmLabel="Add note"
      blockConfirm={!note.trim()}
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Note" value={note} />
          <Line label="Visible to" value="Admins only" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminAddBookingNote", {
          bookingId: booking.id,
          note: note.trim(),
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="admin-note-body">Note</Label>
        <Textarea
          id="admin-note-body"
          className="rounded-xl"
          rows={3}
          placeholder="What should the next admin know?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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