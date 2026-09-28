import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// RETIRED — Stripe Identity verification has been removed. The admin toggle
// no longer controls anything. This function is kept for backward
// compatibility but always returns enabled: false.
Deno.serve(async (req) => {
  try {
    const origin = req.headers.get('origin');
    if (origin) {
      let trusted = false;
      try {
        const url = new URL(origin);
        const host = url.hostname;
        trusted = host === 'base44.app' || host.endsWith('.base44.app') || host.endsWith('.base44.dev');
      } catch { /* invalid origin — not trusted */ }
      if (!trusted) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return Response.json({ enabled: false });
  } catch (error) {
    return Response.json({ enabled: false });
  }
});