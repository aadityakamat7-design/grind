import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// RETIRED — Stripe Identity verification has been removed. Parents are now
// verified through Stripe Connect Express onboarding (legal name, DOB, SSN,
// bank account, 18+), checked server-side via isParentVerifiedByStripe.
//
// This function now returns a deprecation message so any leftover caller is
// redirected to the Connect onboarding flow instead of being blocked.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    return Response.json({
      error: 'ID verification is no longer required. Please complete your Stripe payout setup instead.',
      redirect: 'connect',
    }, { status: 410 });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});