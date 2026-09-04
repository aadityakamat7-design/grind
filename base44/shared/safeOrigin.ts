const DEFAULT_ORIGIN = 'https://teenskickstart.base44.app';

// Only redirect back to trusted app domains — never to an attacker-supplied Origin header.
export function getSafeOrigin(req: Request): string {
  const origin = req.headers.get('origin');
  if (!origin) return DEFAULT_ORIGIN;
  try {
    const url = new URL(origin);
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