// Single source of truth for the app's production base URL.
// Every redirect, callback, and generated link references this so the
// domain can never drift across files.
export const APP_BASE_URL = 'https://blockwork.online';

// Backwards-compatible alias — some callers still import DEFAULT_ORIGIN.
const DEFAULT_ORIGIN = APP_BASE_URL;

// Validates an origin string and returns it if it's a trusted app domain,
// otherwise APP_BASE_URL. Shared by getSafeOrigin (header-based) and the
// frontend-provided origin param (which is more reliable in preview iframes).
export function safeOriginFromString(originStr: string | null | undefined): string {
  if (!originStr) return APP_BASE_URL;
  try {
    const url = new URL(originStr);
    if (url.protocol !== 'https:') return APP_BASE_URL;
    const host = url.hostname;
    // Production custom domain (blockwork.online) is the primary origin.
    // Base44 domains are kept only so the builder preview still works —
    // production redirects always target blockwork.online via APP_BASE_URL.
    if (
      host === 'blockwork.online' || host.endsWith('.blockwork.online') ||
      host === 'base44.app' || host.endsWith('.base44.app') || host.endsWith('--base44.app') ||
      host === 'base44.dev' || host.endsWith('.base44.dev') || host.endsWith('--base44.dev')
    ) {
      return url.origin;
    }
  } catch {
    // fall through to default
  }
  return APP_BASE_URL;
}

// Only redirect back to trusted app domains — never to an attacker-supplied Origin header.
export function getSafeOrigin(req: Request): string {
  return safeOriginFromString(req.headers.get('origin'));
}