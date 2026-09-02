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
      // Checkout where the app reloads mid-session). Retry once before
      // giving up — don't log the user out unnecessarily.
      const token = typeof window !== 'undefined' && window.localStorage.getItem('base44_access_token');
      if (token) {
        try {
          await new Promise(r => setTimeout(r, 800));
          const u = await fetchUser();
          cachedUser = u;
          setUser(u);
          setLoading(false);
          return;
        } catch {
          // Still failed — fall through to set user null
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