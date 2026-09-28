import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// RETIRED — Stripe Identity verification has been removed. Parents are now
// verified through Stripe Connect Express onboarding. This function returns
// 'verified' so any leftover caller is not blocked — the real check is the
// Connect account status, enforced server-side in confirmParentLink and
// decideBooking.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({ status: 'verified' });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});