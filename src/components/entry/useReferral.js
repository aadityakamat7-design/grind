import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// A referral code arrives on the link (?ref=). It is kept only until the new
// account finishes sign-up, then recorded once.
export default function useReferral(user, params) {
  useEffect(() => {
    if (params.ref) localStorage.setItem("grind_referral", params.ref);
  }, [params.ref]);

  useEffect(() => {
    const ref = localStorage.getItem("grind_referral");
    if (user?.onboarded && ref && user?.id !== ref) {
      base44.functions
        .invoke("trackReferral", { referrerId: ref, referredEmail: user.email })
        .catch(() => {})
        .finally(() => localStorage.removeItem("grind_referral"));
    }
  }, [user?.onboarded, user?.id, user?.email]);
}