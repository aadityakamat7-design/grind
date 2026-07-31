import { useState, useCallback, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const PENDING_KEY = "kickstart_pending_approval";

// Wraps the booking approval/denial flow with deferred identity verification
// and bank connection. If the parent isn't verified or hasn't connected a
// payout account, it opens the verification gate instead of calling
// decideBooking. After the entire flow succeeds, it automatically completes
// the originally-requested approval.
//
// profile: the parent's ParentProfile record (must be loaded by the caller)
// onDecided: callback after a successful approve/deny
//
// Returns: { gateOpen, setGateOpen, attempt, onVerified, acting, initialStep }
//   attempt(booking, approve) — call from an Approve/Deny button
//   initialStep — "verify" if the parent needs ID, "bank" if only bank is missing
export function useApprovalWithVerification(profile, onDecided) {
  const [gateOpen, setGateOpen] = useState(false);
  const [acting, setActing] = useState(null);
  const pendingRef = useRef(null); // { bookingId, approve, booking }

  const initialStep = profile?.is_identity_verified ? "bank" : "verify";

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
    // Deny/refund doesn't require verification — go straight through.
    if (!approve) {
      try {
        await runDecide(booking, approve);
        onDecided?.();
      } catch (err) {
        alert(err.response?.data?.error || "This booking could not be updated.");
      }
      return;
    }

    // Approve — check whether verification or bank connection is still needed.
    const needsVerify = !profile?.is_identity_verified;
    const needsBank = profile?.connect_status !== "active";

    if (!needsVerify && !needsBank) {
      try {
        await runDecide(booking, approve);
        onDecided?.();
      } catch (err) {
        alert(err.response?.data?.error || "This booking could not be updated.");
      }
      return;
    }

    // Stash the pending action and open the gate (survives the Stripe redirect)
    pendingRef.current = { bookingId: booking.id, approve, booking };
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ bookingId: booking.id, approve })); } catch { /* ignore */ }
    setGateOpen(true);
  }, [profile, onDecided, runDecide]);

  // Auto-reopen the gate after a Stripe redirect if a flow is mid-flight
  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
      if (pending) {
        pendingRef.current = pending;
        setGateOpen(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Clean up the pending flow if the gate is closed without completing
  useEffect(() => {
    if (!gateOpen && pendingRef.current) {
      try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
      pendingRef.current = null;
    }
  }, [gateOpen]);

  const onVerified = useCallback(async () => {
    let pending = pendingRef.current;
    if (!pending) {
      try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch { /* ignore */ }
    }
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    setGateOpen(false);
    pendingRef.current = null;

    if (!pending) {
      onDecided?.();
      return;
    }

    try {
      await runDecide(pending.booking || { id: pending.bookingId }, pending.approve);
      onDecided?.();
    } catch (err) {
      alert(err.response?.data?.error || "This booking could not be updated.");
    }
  }, [onDecided, runDecide]);

  return { gateOpen, setGateOpen, attempt, onVerified, acting, initialStep };
}