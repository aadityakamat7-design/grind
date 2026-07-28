import { useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";

const PENDING_KEY = "kickstart_pending_approval";

// Wraps the booking approval/denial flow with deferred identity verification.
// If the parent isn't verified yet, it opens the verification gate instead of
// calling decideBooking. After verification succeeds, it automatically
// completes the originally-requested approval/denial.
//
// profile: the parent's ParentProfile record (must be loaded by the caller)
// onDecided: callback after a successful approve/deny
//
// Returns: { gateOpen, setGateOpen, attempt, pendingBookingId }
//   attempt(booking, approve) — call from an Approve/Deny button
export function useApprovalWithVerification(profile, onDecided) {
  const [gateOpen, setGateOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const pendingRef = useRef(null); // { bookingId, approve, booking }

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
    // Already verified — go straight through.
    if (profile?.is_identity_verified) {
      try {
        await runDecide(booking, approve);
        onDecided?.();
      } catch (err) {
        alert(err.response?.data?.error || "This booking could not be updated.");
      }
      return;
    }

    // Not verified — stash the pending action and open the gate.
    pendingRef.current = { bookingId: booking.id, approve, booking };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ bookingId: booking.id, approve })); } catch { /* ignore */ }
    setGateOpen(true);
  }, [profile, onDecided, runDecide]);

  const onVerified = useCallback(async () => {
    // Read back the pending action (survives the Stripe redirect)
    let pending = pendingRef.current;
    if (!pending) {
      try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch { /* ignore */ }
    }
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    setGateOpen(false);

    if (!pending) {
      // Verified but nothing was queued (e.g. user opened gate manually) — just refresh
      onDecided?.();
      return;
    }

    pendingRef.current = null;
    try {
      await runDecide(pending.booking || { id: pending.bookingId }, pending.approve);
      onDecided?.();
    } catch (err) {
      alert(err.response?.data?.error || "This booking could not be updated.");
    }
  }, [onDecided, runDecide]);

  return { gateOpen, setGateOpen, attempt, onVerified, acting };
}