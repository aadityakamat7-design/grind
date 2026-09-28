import { getStripeForApp } from './stripeEnv.ts';

// A parent counts as verified ONLY when their Stripe Connect Express account
// shows, from the server: details_submitted: true, payouts_enabled: true, and
// no outstanding requirements.currently_due. This is checked on the server
// every time the parent confirms a link or approves a booking — never trust a
// status sent from the browser.
//
// If Stripe later disables the account or asks for more information, the
// parent's ability to approve bookings is paused until it's resolved.
export async function isParentVerifiedByStripe(base44, parentUserId): Promise<{
  verified: boolean;
  status: string;        // 'active' | 'pending' | 'restricted' | 'not_setup'
  reason?: string;        // machine-readable reason when not verified
  message?: string;       // human-readable message for the UI
}> {
  const svc = base44.asServiceRole.entities;
  const profiles = await svc.ParentProfile.filter({ user_id: parentUserId });
  const profile = profiles[0];
  if (!profile?.stripe_connect_account_id) {
    return {
      verified: false,
      status: 'not_setup',
      reason: 'no_connect_account',
      message: 'You must complete your Stripe payout setup before you can confirm your teen or approve bookings.',
    };
  }

  const stripe = await getStripeForApp(base44);
  let account;
  try {
    account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
  } catch (err) {
    // The stored account may not exist in the current Stripe mode. Clear it
    // so the parent can start fresh.
    if (err.message?.includes('No such account') || err.code === 'resource_missing') {
      await svc.ParentProfile.update(profile.id, {
        stripe_connect_account_id: '',
        connect_status: 'not_setup',
        bank_last4: '',
        bank_name: '',
      });
      return {
        verified: false,
        status: 'not_setup',
        reason: 'account_missing',
        message: 'Your payout account needs to be set up again. Please complete your Stripe payout setup.',
      };
    }
    throw err;
  }

  const detailsSubmitted = !!account.details_submitted;
  const payoutsEnabled = !!account.payouts_enabled;
  const currentlyDue = (account.requirements?.currently_due?.length ?? 0) > 0;

  let status = 'pending';
  if (payoutsEnabled && detailsSubmitted && !currentlyDue) status = 'active';
  else if (account.requirements?.disabled_reason) status = 'restricted';

  // Sync the stored status + masked bank info so the dashboard stays current.
  const bank = account.external_accounts?.data?.find((a) => a.object === 'bank_account')
    || account.external_accounts?.data?.[0];
  await svc.ParentProfile.update(profile.id, {
    connect_status: status,
    bank_last4: bank?.last4 || '',
    bank_name: bank?.bank_name || '',
  });

  const verified = payoutsEnabled && detailsSubmitted && !currentlyDue;
  if (verified) return { verified: true, status: 'active' };

  const message = currentlyDue
    ? 'Stripe needs a bit more information to finish your payout account. Please complete your Stripe payout setup before confirming your teen or approving bookings.'
    : status === 'restricted'
      ? 'Your payout account is restricted. Please complete your Stripe payout setup to resume approving bookings.'
      : 'Your Stripe payout setup is not complete yet. Please finish it before confirming your teen or approving bookings.';

  return { verified: false, status, reason: currentlyDue ? 'requirements_due' : status, message };
}