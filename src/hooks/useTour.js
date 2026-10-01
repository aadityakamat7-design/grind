import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { setCachedUser } from "@/lib/useAppUser";
import { useTermsGate } from "@/lib/TermsGateContext";

// Shows a one-time guided tour for the given role. has_seen_tour is stored on
// the account (not the browser), so finishing or skipping it on one device
// keeps it done everywhere. Replay is triggered via localStorage("replay_tour")
// — set by replayTour() and consumed on the next dashboard mount.
export function useTour(user, role, ready = true) {
  const [active, setActive] = useState(false);
  // The "Updated Terms" pop-up is the only overlay allowed to open first, so
  // the tour holds until the terms check has resolved — the two never stack.
  const { status: termsStatus } = useTermsGate();

  useEffect(() => {
    if (!ready || !user || !user.id || user.app_role !== role) return;
    if (termsStatus !== "clear") return;

    const replay = typeof window !== "undefined" && localStorage.getItem("replay_tour");
    if (replay === "1") {
      localStorage.removeItem("replay_tour");
      const timer = setTimeout(() => setActive(true), 500);
      return () => clearTimeout(timer);
    }

    if (user.has_seen_tour) return;
    const timer = setTimeout(() => setActive(true), 500);
    return () => clearTimeout(timer);
  }, [user, role, ready, termsStatus]);

  // Finishing the tour and skipping it both mark it done, on the account.
  const finish = useCallback(async () => {
    setActive(false);
    try {
      await base44.auth.updateMe({ has_seen_tour: true });
      setCachedUser({ ...user, has_seen_tour: true });
    } catch {
      // non-critical — the tour just won't be remembered
    }
  }, [user]);

  return { active, finish };
}

// Call from Account/Settings to replay the tour on next dashboard visit.
export function replayTour() {
  if (typeof window !== "undefined") {
    localStorage.setItem("replay_tour", "1");
  }
}