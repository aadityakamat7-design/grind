import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

// Starts Stripe Connect Express hosted onboarding for the parent's payout
// account. Bank details are entered directly with Stripe — never stored here.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const returnPath = typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/parent/payouts';

    const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile?.is_identity_verified) {
      return Response.json({ error: 'Identity verification is required before setting up payouts.' }, { status: 403 });
    }

    const stripe = getStripe();
    let accountId = profile.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id: user.id,
        },
      });
      accountId = account.id;
      await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
        stripe_connect_account_id: accountId,
        connect_status: 'pending',
      });
    }

    const origin = getSafeOrigin(req);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}${returnPath}?connect=refresh`,
      return_url: `${origin}${returnPath}?connect=return`,
      type: 'account_onboarding',
    });

    return Response.json({ url: link.url });
  } catch (error) {
    console.error('createConnectOnboarding error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});