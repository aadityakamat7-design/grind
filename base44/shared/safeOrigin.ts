const DEFAULT_ORIGIN = 'https://teenskickstart.base44.app';

// Validates an origin string and returns it if it's a trusted app domain,
// otherwise DEFAULT_ORIGIN. Shared by getSafeOrigin (header-based) and the
// frontend-provided origin param (which is more reliable in preview iframes).
export function safeOriginFromString(originStr: string | null | undefined): string {
  if (!originStr) return DEFAULT_ORIGIN;
  try {
    const url = new URL(originStr);
    if (url.protocol !== 'https:') return DEFAULT_ORIGIN;
    const host = url.hostname;
    // Accept the published app (foo.base44.app) and preview hosts, which use
    // `--` separators (e.g. preview-sandbox--<app>--base44.app). Without the
    // `--` check, preview sessions fall back to the published origin and
    // Stripe cancel/success redirects bounce the user to the published app
    // (where they aren't logged in) instead of back to the booking.
    if (
      host === 'base44.app' || host.endsWith('.base44.app') || host.endsWith('--base44.app') ||
      host === 'base44.dev' || host.endsWith('.base44.dev') || host.endsWith('--base44.dev')
    ) {
      return url.origin;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ORIGIN;
}

// Only redirect back to trusted app domains — never to an attacker-supplied Origin header.
export function getSafeOrigin(req: Request): string {
  return safeOriginFromString(req.headers.get('origin'));
}