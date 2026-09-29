import React from "react";
import AdminActionDialog from "@/components/grind/admin/AdminActionDialog";
import { adminInvoke, UNLINK_REASONS } from "@/lib/adminApi";

// End a parent's supervision of a teen. This is the one place support removes a
// link, so everything the link carried goes with it: the parental consent, the
// parent's say over bookings and payouts, and the invite code they used.
export default function AdminUnlinkDialog({ open, onOpenChange, link, parentName, onDone }) {
  const teenName = link?.teen_display_name || "this teen";

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="End this parent link"
      description="The parent stops being this teen's guardian on Blockwork. The teen's account is not suspended."
      reasons={UNLINK_REASONS}
      destructive
      confirmLabel="End the link"
      summary={
        <>
          <Row label="Teen" value={teenName} />
          <Row label="Parent" value={parentName || "—"} />
          <Row
            label="What changes"
            value="Parental consent is revoked, the parent can no longer approve this teen's bookings or receive their payouts, and the teen waits for a parent to link again before they can work — unless they're 18 and working independently."
          />
          <Row
            label="Link code"
            value={`${teenName}'s invite code is replaced, so this link can't be recreated with the code this parent already had. The new code is on the teen's dashboard.`}
          />
        </>
      }
      warning="Both people are notified. Anything already booked keeps running — cancel or hold it from the booking tools if it needs to end."
      onConfirm={async ({ reason_code, reason_note }) => {
        await adminInvoke("adminUnlinkParentTeen", {
          linkId: link.id,
          reason_code,
          reason_note,
        });
        onDone?.();
      }}
    />
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}