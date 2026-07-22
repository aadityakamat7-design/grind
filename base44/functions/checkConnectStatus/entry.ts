import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';

// Syncs the parent's Stripe Connect account status. Only stores the status and
// masked bank info returned by Stripe — never raw account/routing numbers.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile?.stripe_connect_account_id) return Response.json({ status: 'not_setup' });

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

    let status = 'pending';
    if (account.payouts_enabled && account.details_submitted) status = 'active';
    else if (account.requirements?.disabled_reason) status = 'restricted';

    const bank = account.external_accounts?.data?.find((a) => a.object === 'bank_account')
      || account.external_accounts?.data?.[0];

    await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
      connect_status: status,
      bank_last4: bank?.last4 || '',
      bank_name: bank?.bank_name || '',
    });

    return Response.json({ status, bankLast4: bank?.last4 || '', bankName: bank?.bank_name || '' });
  } catch (error) {
    console.error('checkConnectStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});