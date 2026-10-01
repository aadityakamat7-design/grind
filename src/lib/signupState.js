// Sign-up state rules.
//
// The role is NEVER inferred from device storage, an invite/connection code, a
// previous sign-up, or a default. The only accepted sources are:
//   1. the role picker's explicit choice (?role= in the URL), and
//   2. the account's own app_role, set server-side by saveSignupRole.
//
// Device storage is only ever used for short-lived flow carry-over (an invite
// code across an auth redirect, a teen's eligibility answer), and every key is
// cleared on sign-out, on a new sign-up, and on "Change role".

export const ALLOWED_ROLES = ["teen", "parent", "buyer"];

// Short-lived progress for the sign-up currently in flight.
const PROGRESS_KEYS = [
  "grind_signup_role",
  "kickstart_teen_dob",
  "kickstart_teen_state",
  "kickstart_teen_min_age",
];

// Everything, including the invite code — used when the device is handed over
// (sign-out) so nothing leaks into the next person's sign-up.
const ALL_KEYS = [...PROGRESS_KEYS, "grind_invite_code", "grind_referral"];

const remove = (keys) => {
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable (private mode) — nothing to clear */
  }
};

export function clearSignupProgress() {
  remove(PROGRESS_KEYS);
}

export function clearSignupState() {
  remove(ALL_KEYS);
}

// Legacy key kept separate so an old role residue is always dropped.
export function clearStoredRole() {
  remove(["grind_signup_role"]);
}

// Reads the picker's explicit choice. Returns null when absent or unrecognized —
// callers must show the picker rather than falling back to a role.
export function readRoleFromUrl() {
  try {
    const role = new URLSearchParams(window.location.search).get("role");
    return ALLOWED_ROLES.includes(role) ? role : null;
  } catch {
    return null;
  }
}

// A real name: letters (plus spaces, hyphens, apostrophes, periods), at least
// two letters, and never the email username the platform assigns as full_name.
export function isRealName(value, email) {
  const v = String(value || "").trim();
  if (v.length < 2 || v.length > 60) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;
  if (!/^[A-Za-z][A-Za-z'’.\- ]*$/.test(v)) return false;
  const username = String(email || "").split("@")[0].trim().toLowerCase();
  if (username && v.toLowerCase() === username) return false;
  return true;
}

// A saved name is only offered as a starting point when it is a real name —
// never the email username the platform writes at sign-up.
export function seededName(user) {
  const raw = String(user?.full_name || "").trim();
  if (!raw || raw.includes("@")) return "";
  if (!isRealName(raw, user?.email)) return "";
  return raw;
}

export const isCaliforniaZip = (zip) => /^\d{5}$/.test(String(zip || "").trim());