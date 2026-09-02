import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp } from '../../shared/stripeEnv.ts';

// Syncs the Stripe Connect account status for a parent or an independent
// 18+ teen. Only stores the status and masked bank info returned by Stripe —
// never raw account/routing numbers.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const [parentProfiles, teenProfiles] = await Promise.all([
      svc.ParentProfile.filter({ user_id: user.id }),
      svc.TeenProfile.filter({ user_id: user.id }),
    ]);

    const isParent = !!parentProfiles[0];
    const profile = isParent ? parentProfiles[0] : teenProfiles[0];
    if (!profile?.stripe_connect_account_id) return Response.json({ status: 'not_setup' });

    const stripe = await getStripeForApp(base44);
    let account;
    try {
      account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    } catch (retrieveErr) {
      // The stored account may not exist in the current Stripe mode (e.g. a
      // simulated/test account ID used with live keys). Clear it and return
      // not_setup so the user can start fresh.
      if (retrieveErr.message?.includes('No such account') || retrieveErr.code === 'resource_missing') {
        const updateEntity = isParent ? svc.ParentProfile : svc.TeenProfile;
        await updateEntity.update(profile.id, {
          stripe_connect_account_id: '',
          connect_status: 'not_setup',
          bank_last4: '',
          bank_name: '',
        });
        return Response.json({ status: 'not_setup' });
      }
      throw retrieveErr;
    }

    let status = 'pending';
    if (account.payouts_enabled && account.details_submitted) status = 'active';
    else if (account.requirements?.disabled_reason) status = 'restricted';

    const bank = account.external_accounts?.data?.find((a) => a.object === 'bank_account')
      || account.external_accounts?.data?.[0];

    const updateEntity = isParent ? svc.ParentProfile : svc.TeenProfile;
    await updateEntity.update(profile.id, {
      connect_status: status,
      bank_last4: bank?.last4 || '',
      bank_name: bank?.bank_name || '',
    });

    return Response.json({ status, bankLast4: bank?.last4 || '', bankName: bank?.bank_name || '' });
  } catch (error) {
    console.error('checkConnectStatus error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});