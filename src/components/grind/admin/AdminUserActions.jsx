import React from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// The safety-only account actions for support: pause an account, or end a
// parent's supervision of a teen. Nothing that loosens a limit lives here.
export default function AdminUserActions({ target, confirmedLinks, onSuspend, onUnlink }) {
  const onHold = target.account_status === "suspended";

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <p className="font-bold text-foreground flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-destructive" /> Safety actions
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {onHold
          ? `This account is on hold${target.account_status_reason ? ` — ${target.account_status_reason}` : ""}. It can still sign in and see its own records, but it cannot start anything new.`
          : "Pausing an account stops new jobs, bookings, listings and messages. Anything already booked stays booked."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={onHold ? "outline" : "destructive"} onClick={onSuspend}>
          {onHold ? "Lift the hold" : "Put account on hold"}
        </Button>
        {confirmedLinks.map((link) => (
          <Button key={link.id} size="sm" variant="outline" onClick={() => onUnlink(link)}>
            {link.parent_user_id === target.id
              ? `Unlink ${link.teen_display_name || "this teen"}`
              : "Unlink parent"}
          </Button>
        ))}
      </div>
    </div>
  );
}