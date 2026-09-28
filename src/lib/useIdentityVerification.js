import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// RETIRED — Stripe Identity verification has been removed. Parents are now
// verified through Stripe Connect Express onboarding. This hook always
// returns enabled: false so any UI that conditionally showed the identity
// step now hides it.
export function useIdentityVerification() {
  const refresh = useCallback(async () => {}, []);
  return { identityVerificationEnabled: false, loading: false, refresh };
}