import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// Fetches the admin-controlled Stripe test-mode flag. Re-fetches on route
// change and on a 15s poll so the TEST MODE banner appears shortly after an
// admin flips the toggle. Defaults to false (live) on any error.
export function useTestMode() {
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("getTestModeStatus", {});
      setTestMode(res.data?.testMode === true);
    } catch {
      setTestMode(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return { testMode, loading, refresh };
}