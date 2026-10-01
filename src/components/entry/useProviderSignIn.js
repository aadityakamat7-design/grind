import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { PROVIDER_LABELS } from "@/lib/authProviders";
import { startUrl } from "@/lib/entryRoute";

// Starts Google / Apple / Facebook sign-in. Anything that must survive the trip to
// the provider and back (an invite code, the page they were heading to) is saved
// on the server first and rides back as a one-time token in the return address —
// browser storage, which iPhone often wipes during a redirect, is never relied on.
export default function useProviderSignIn(params) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async (provider) => {
    setError("");
    setBusy(true);
    try {
      let token = "";
      if (params.code || params.dest) {
        try {
          const res = await base44.functions.invoke("startSignup", { code: params.code, dest: params.dest });
          token = res.data?.token || "";
        } catch {
          /* the same values also ride in the return address below */
        }
      }
      const next = startUrl({ token, am: provider, dest: params.dest, code: params.code, role: params.role, ref: params.ref });
      await base44.auth.loginWithProvider(provider, next);
    } catch {
      setError(`Couldn't reach ${PROVIDER_LABELS[provider] || provider}, try again.`);
      setBusy(false);
    }
  };

  return { start, error, busy };
}