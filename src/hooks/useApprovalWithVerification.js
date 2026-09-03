import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Wraps the booking approval/denial flow. Parents can approve bookings without
// identity verification or a payout account — the teen can do the job and earn
// money, but earnings are locked in the Blockwork Wallet until the parent
// completes payout setup (walletCashOut and the payout transfer both enforce
// this). No gate is shown.
//
// profile: the parent's ParentProfile record (kept for API compatibility)
// onDecided: callback after a successful approve/deny
//
// Returns: { gateOpen, setGateOpen, attempt, onVerified, acting, initialStep }
//   attempt(booking, approve) — call from an Approve/Deny button
export function useApprovalWithVerification(profile, onDecided) {
  const [acting, setActing] = useState(null);

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
    try {
      await runDecide(booking, approve);
      onDecided?.();
    } catch (err) {
      alert(err.response?.data?.error || "This booking could not be updated.");
    }
  }, [onDecided, runDecide]);

  // Kept for API compatibility — no gate is shown anymore.
  const gateOpen = false;
  const setGateOpen = () => {};
  const onVerified = useCallback(() => { onDecided?.(); }, [onDecided]);
  const initialStep = "bank";

  return { gateOpen, setGateOpen, attempt, onVerified, acting, initialStep };
}