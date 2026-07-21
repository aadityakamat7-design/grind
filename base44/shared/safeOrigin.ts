const DEFAULT_ORIGIN = 'https://grind-local-link.base44.app';

// Only redirect back to trusted app domains — never to an attacker-supplied Origin header.
export function getSafeOrigin(req: Request): string {
  const origin = req.headers.get('origin');
  if (!origin) return DEFAULT_ORIGIN;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return DEFAULT_ORIGIN;
    const host = url.hostname;
    if (host === 'base44.app' || host.endsWith('.base44.app') || host.endsWith('.base44.dev')) {
      return url.origin;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ORIGIN;
}