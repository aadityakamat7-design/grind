import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function useGrindUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { user, loading, reload };
}