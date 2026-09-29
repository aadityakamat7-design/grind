import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import AdminAuditLogPanel from "./AdminAuditLogPanel";

// Global view of every admin action, filterable by the booking or the user it
// affected. Filtering happens on the server so the log stays usable as it grows.
export default function AdminAuditTab() {
  const [bookingInput, setBookingInput] = useState("");
  const [userInput, setUserInput] = useState("");
  const [applied, setApplied] = useState({ bookingId: "", userId: "" });

  const apply = () => setApplied({ bookingId: bookingInput.trim(), userId: userInput.trim() });
  const clear = () => {
    setBookingInput("");
    setUserInput("");
    setApplied({ bookingId: "", userId: "" });
  };

  const active = applied.bookingId || applied.userId;

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">Find an admin action</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="audit-booking">Booking ID</Label>
            <Input
              id="audit-booking"
              className="rounded-xl"
              placeholder="Paste a booking ID"
              value={bookingInput}
              onChange={(e) => setBookingInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-user">User ID</Label>
            <Input
              id="audit-user"
              className="rounded-xl"
              placeholder="Paste a user ID"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={apply}>
            <Search className="w-4 h-4" /> Filter
          </Button>
          {active && <Button size="sm" variant="ghost" onClick={clear}>Clear</Button>}
        </div>
      </div>

      <AdminAuditLogPanel bookingId={applied.bookingId} userId={applied.userId} />
    </div>
  );
}