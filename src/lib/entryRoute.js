// The entry system's single source of truth for URLs and "where does this person
// go next". Everything read from a URL is cleaned here before it is used, and the
// decision is made from the server's data only — never from browser storage.

export const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

const SIGN_IN_PAGES = /^\/(start|login|register|signup|onboarding)(\/|\?|#|$)/i;
const SESSION_PARAMS = ["access_token", "clear_access_token", "app_id", "app_base_url", "functions_version", "from_url"];

// A same-site path to go to after sign-in, or "" when there is none. Never an
// absolute URL, never a sign-in page (that would loop), never session params.
export function cleanDest(raw) {
  if (!raw) return "";
  try {
    const url = new URL(String(raw), window.location.origin);
    if (url.origin !== window.location.origin) return "";
    SESSION_PARAMS.forEach((p) => url.searchParams.delete(p));
    const path = url.pathname + url.search;
    if (path === "/" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "";
    if (SIGN_IN_PAGES.test(path)) return "";
    return path;
  } catch {
    return "";
  }
}

export function cleanCode(raw) {
  const s = String(raw || "").trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(s) ? s : "";
}

const ROLES = ["teen", "parent", "buyer"];

// Everything the entry page can be opened with. An invite code always means a
// parent, so the role is forced to parent and locked.
export function readEntryParams() {
  const p = new URLSearchParams(window.location.search);
  const code = cleanCode(p.get("code"));
  const role = code ? "parent" : ROLES.includes(p.get("role")) ? p.get("role") : "";
  return {
    code,
    role,
    roleLocked: !!code,
    dest: cleanDest(p.get("returnTo")),
    ref: (p.get("ref") || "").slice(0, 64),
    email: (p.get("email") || "").trim().slice(0, 254),
    notice: p.get("notice") || "",
    loop: p.get("loop") === "1",
    st: p.get("st") || "",
    am: p.get("am") || "",
  };
}

// The address every sign-in hands off to: /start again, now signed in, carrying
// the one-time token and whatever else the next screen needs.
export function startUrl({ token, am, dest, code, role, ref } = {}) {
  const q = new URLSearchParams();
  if (token) q.set("st", token);
  if (am) q.set("am", am);
  if (dest) q.set("returnTo", dest);
  if (code) q.set("code", code);
  if (role) q.set("role", role);
  if (ref) q.set("ref", ref);
  const qs = q.toString();
  return qs ? `/start?${qs}` : "/start";
}

export const isFinished = (user) => !!(user && user.app_role && user.onboarded);

// The one routing decision for a finished account:
//   1. a saved destination (approval email, deep link),
//   2. a parent with an invite code → the link confirmation,
//   3. the dashboard for their role.
// An unfinished account is never routed here — it resumes its sign-up step.
export function decideRoute(user, intent = {}) {
  const role = String(user?.app_role || "").toLowerCase();
  const dest = cleanDest(intent.dest || user?.saved_destination);
  if (dest) return dest;
  const code = cleanCode(intent.code || user?.pending_invite_code);
  if (code && role === "parent") return `/parent/link?code=${code}`;
  return ROLE_HOME[role] || "/";
}