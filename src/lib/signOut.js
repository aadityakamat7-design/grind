import { base44 } from "@/api/base44Client";
import { clearSignupState } from "@/lib/signupState";

const EXTRA_KEYS = ["grind_remembered_email", "bw_redirects", "bw_reset_email"];

// Everything the entry system keeps in the browser: sign-up progress, invite and
// referral codes, the remembered email, the password-reset email, and the
// redirect-loop counter.
export function clearBrowserAuthData() {
  clearSignupState();
  try {
    EXTRA_KEYS.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch {
    /* storage unavailable (private mode) — nothing to clear */
  }
}

// Sign out: clear the saved sign-in and sign-up data, end the session, and go to
// `to` (the home page unless told otherwise).
export function signOut(to = "/") {
  clearBrowserAuthData();
  base44.auth.logout(to);
}