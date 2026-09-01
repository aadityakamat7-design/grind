import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

// Starts Stripe Connect Express hosted onboarding for a payout account.
// Parents (of minors) and independent 18+ teens both use this — bank details
// are entered directly with Stripe, never stored here. Identity verification
// is required first for both roles.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const returnPath = typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/parent/payouts';

    const svc = base44.asServiceRole.entities;
    const [parentProfiles, teenProfiles] = await Promise.all([
      svc.ParentProfile.filter({ user_id: user.id }),
      svc.TeenProfile.filter({ user_id: user.id }),
    ]);

    const isParent = !!parentProfiles[0];
    const isTeen = !!teenProfiles[0];
    if (!isParent && !isTeen) {
      return Response.json({ error: 'No payout profile found.' }, { status: 400 });
    }

    // Identity verification is required before payouts can be enabled — for
    // both parents and independent teens.
    const identityOk = isParent
      ? !!parentProfiles[0].is_identity_verified
      : teenProfiles[0].identity_status === 'verified';
    if (!identityOk) {
      return Response.json({ error: 'Identity verification is required before setting up payouts.' }, { status: 403 });
    }

    const profile = isParent ? parentProfiles[0] : teenProfiles[0];
    const updateEntity = isParent ? svc.ParentProfile : svc.TeenProfile;
    const stripe = await getStripeForApp(base44);

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
          subject: isParent ? 'parent' : 'teen',
        },
      });
      accountId = account.id;
      await updateEntity.update(profile.id, {
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
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});