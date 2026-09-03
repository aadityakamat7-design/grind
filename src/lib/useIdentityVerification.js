import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Fetches the admin-controlled identity-verification toggle. Defaults to
// true (enabled, fails safe) on any error. Re-fetches on a 15s poll so the
// UI updates shortly after an admin flips the toggle.
export function useIdentityVerification() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getIdentityVerificationStatus", {});
      setEnabled(res.data?.enabled !== false);
    } catch {
      setEnabled(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return { identityVerificationEnabled: enabled, loading, refresh };
}