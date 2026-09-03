import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so page-transition remounts don't flash a loading spinner.
let cachedUser = null;

// Update the cache after base44.auth.updateMe() so the next page mount uses
// the fresh user instead of a stale snapshot (avoids redirect loops).
export function setCachedUser(u) {
  cachedUser = u;
}

// Loads the current authenticated user (with app_role). Handles public/no-auth gracefully.
export function useAppUser() {
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);

  const reload = useCallback(async () => {
    const fetchUser = async () => {
      const u = await base44.auth.me();
      if (u && u.app_role) u.app_role = u.app_role.toLowerCase();
      return u;
    };
    try {
      const u = await fetchUser();
      cachedUser = u;
      setUser(u);
    } catch {
      // If the token exists in localStorage, this is likely a transient
      // failure (e.g. returning from an external redirect like Stripe
      // Checkout/Identity/Connect where the app reloads mid-session).
      // Retry up to 3 times with increasing delays before giving up.
      const token = typeof window !== 'undefined' && window.localStorage.getItem('base44_access_token');
      if (token) {
        const delays = [800, 1500, 2500];
        for (let i = 0; i < delays.length; i++) {
          try {
            await new Promise(r => setTimeout(r, delays[i]));
            const u = await fetchUser();
            cachedUser = u;
            setUser(u);
            setLoading(false);
            return;
          } catch {
            // continue to next retry
          }
        }
      }
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