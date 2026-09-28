import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Wraps the booking approval/denial flow. The parent's Stripe Connect account
// must be fully verified before they can approve a booking — the server
// enforces this in decideBooking. If approval fails with a Connect-required
// error, the caller can redirect the parent to complete their payout setup.
// Denial is always allowed (it just refunds the neighbor).
//
// profile: the parent's ParentProfile record (kept for API compatibility)
// onDecided: callback after a successful approve/deny
//
// Returns: { attempt, acting, connectRequired, clearConnectRequired }
//   attempt(booking, approve) — call from an Approve/Deny button
export function useApprovalWithVerification(profile, onDecided) {
  const [acting, setActing] = useState(null);
  const [connectRequired, setConnectRequired] = useState(false);

  const runDecide = useCallback(async (booking, approve) => {
    setActing(booking.id);
    let res;
    try {
      res = await base44.functions.invoke("decideBooking", { bookingId: booking.id, approve });
    } catch (err) {
      setActing(null);
      throw err;
    }
    setActing(null);
    if (!res.data?.success) {
      throw { response: { data: res.data } };
    }
    return res.data;
  }, []);

  const attempt = useCallback(async (booking, approve) => {
    setConnectRequired(false);
    try {
      await runDecide(booking, approve);
      onDecided?.();
    } catch (err) {
      const msg = err.response?.data?.error || "";
      // The server rejected approval because the parent's Connect account
      // isn't fully verified. Surface this so the UI can prompt them to
      // complete payout setup.
      if (err.response?.data?.connectStatus && !approve) {
        // Denial should always work — but if it somehow fails, show the error.
        alert(msg || "This booking could not be updated.");
      } else if (err.response?.data?.connectStatus) {
        setConnectRequired(true);
        alert(msg || "You must complete your Stripe payout setup before approving bookings.");
      } else {
        alert(msg || "This booking could not be updated.");
      }
    }
  }, [onDecided, runDecide]);

  const clearConnectRequired = useCallback(() => setConnectRequired(false), []);

  return { attempt, acting, connectRequired, clearConnectRequired };
}