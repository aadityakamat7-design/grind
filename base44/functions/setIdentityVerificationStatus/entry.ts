import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// RETIRED — Stripe Identity verification has been removed. This function is
// kept for backward compatibility but is a no-op.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ success: true, enabled: false });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});