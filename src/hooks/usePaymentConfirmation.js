import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Waits for a booking's payment to be confirmed by the verified Stripe
// webhook — never trusts a client-side "payment succeeded" signal.
//
// The booking's payment_status only flips to 'held' inside stripeWebhook
// (signature-verified, idempotent). This hook watches that field via a
// realtime subscription plus a short-interval poll fallback, and reports:
//   'confirming' — still 'unpaid' (webhook hasn't processed yet)
//   'confirmed'  — 'held' / 'releasing' / 'released' (webhook verified the charge)
//   'failed'     — 'payment_failed' (charge declined, via webhook)
//   'timeout'   — 30s elapsed with no confirmation (webhook delayed/missing)
//
// The poll covers the case where the subscription establishes after the
// webhook already wrote 'held'; the subscription makes the common case
// near-instant. The 30s cap prevents a permanent "waiting" limbo.
export function usePaymentConfirmation(bookingId, { enabled = true, timeoutMs = 30000 } = {}) {
  const [state, setState] = useState("confirming");
  const stateRef = useRef("confirming");
  stateRef.current = state;

  useEffect(() => {
    if (!enabled || !bookingId) return;
    let cancelled = false;
    let pollTimer = null;
    let timeoutTimer = null;
    setState("confirming");
    stateRef.current = "confirming";

    const finish = (s) => {
      if (cancelled) return;
      stateRef.current = s;
      setState(s);
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };

    const evaluate = (booking) => {
      if (!booking) return false;
      const ps = booking.payment_status;
      if (ps === "held" || ps === "releasing" || ps === "released") { finish("confirmed"); return true; }
      if (ps === "payment_failed") { finish("failed"); return true; }
      return false;
    };

    // Initial fetch + 2s poll fallback.
    const poll = async () => {
      try {
        const b = await base44.entities.Booking.get(bookingId);
        evaluate(b);
      } catch { /* transient — keep polling */ }
    };
    poll();
    pollTimer = setInterval(poll, 2000);

    // Realtime — fires the instant the webhook writes 'held'.
    const unsub = base44.entities.Booking.subscribe((event) => {
      if (event.type === "update" && event.data?.id === bookingId) evaluate(event.data);
      if (event.type === "create" && event.data?.id === bookingId) evaluate(event.data);
    });

    // 30s cap — never let the UI sit in an ambiguous "waiting" forever.
    timeoutTimer = setTimeout(() => {
      if (stateRef.current === "confirming") finish("timeout");
    }, timeoutMs);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      unsub();
    };
  }, [bookingId, enabled, timeoutMs]);

  return state;
}