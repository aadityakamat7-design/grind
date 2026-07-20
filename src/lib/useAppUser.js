import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so page-transition remounts don't flash a loading spinner.
let cachedUser = null;

// Loads the current authenticated user (with app_role). Handles public/no-auth gracefully.
export function useAppUser() {
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);

  const reload = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      cachedUser = u;
      setUser(u);
    } catch {
      cachedUser = null;
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { user, loading, reload };
}