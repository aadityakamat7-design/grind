// Small, security-sensitive helpers shared by the sign-in / sign-up functions.
// Everything that arrives from a URL or a form is cleaned here, on the server.

export const AUTH_METHODS = ['password', 'google', 'apple', 'facebook'];

export function cleanMethod(v: unknown): string {
  const s = String(v || '').toLowerCase().trim();
  return AUTH_METHODS.includes(s) ? s : '';
}

// A parent invite code: letters and digits only, 4–12 long.
export function cleanCode(v: unknown): string {
  const s = String(v || '').trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(s) ? s : '';
}

export function cleanEmail(v: unknown): string {
  const s = String(v || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254 ? s : '';
}

// A same-site path to send the person to after sign-in. Never an absolute URL,
// never a sign-in page (that would loop), never anything carrying session params.
const SIGN_IN_PAGES = /^\/(start|login|register|signup|onboarding)(\/|\?|#|$)/i;
export function cleanDest(v: unknown): string {
  const s = String(v || '').trim();
  if (!s || s === '/' || s.length > 600) return '';
  if (!s.startsWith('/') || s.startsWith('//') || s.includes('\\')) return '';
  if (SIGN_IN_PAGES.test(s)) return '';
  if (/[?&](access_token|clear_access_token|app_id|app_base_url|functions_version|from_url)=/i.test(s)) return '';
  return s;
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

// Database-backed sliding-window limiter on the AuthAttempt entity (survives
// worker restarts). Returns true when the caller is over the limit; otherwise it
// records this attempt and returns false.
export async function overLimit(svc: any, ip: string, action: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const recent = await svc.AuthAttempt.filter({ ip, action, created_date: { $gte: since } }, '-created_date', limit + 1);
  if (recent.length >= limit) return true;
  await svc.AuthAttempt.create({ ip, action, success: false });
  return false;
}