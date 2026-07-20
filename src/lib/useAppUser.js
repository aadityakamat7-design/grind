import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Loads the current authenticated user (with app_role). Handles public/no-auth gracefully.
export function useAppUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { user, loading, reload };
}