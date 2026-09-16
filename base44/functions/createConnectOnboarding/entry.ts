import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp } from '../../shared/stripeEnv.ts';
import { getSafeOrigin, safeOriginFromString } from '../../shared/safeOrigin.ts';

// Starts Stripe Connect Express hosted onboarding for a payout account.
// Parents (of minors) and independent 18+ teens both use this — bank details
// are entered directly with Stripe, never stored here.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const returnPath = typeof body.returnPath === 'string' && body.returnPath.startsWith('/')
      ? body.returnPath
      : '/parent/payouts';
    const origin = body.origin ? safeOriginFromString(body.origin) : getSafeOrigin(req);

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

    const profile = isParent ? parentProfiles[0] : teenProfiles[0];
    const updateEntity = isParent ? svc.ParentProfile : svc.TeenProfile;
    const stripe = await getStripeForApp(base44);

    const createAccount = async () => {
      // Pre-fill everything we already know (name, DOB, address) so the
      // Stripe onboarding form is as short as possible — the parent just
      // confirms the pre-filled data, adds their bank account, and enters
      // the last 4 of their SSN. KYC is legally required, so identity
      // details can't be skipped, but we eliminate redundant data entry.
      const fullName = (isParent ? profile.full_name : user.full_name) || user.full_name || '';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || undefined;
      const lastName = nameParts.slice(1).join(' ') || undefined;
      const dob = isParent ? profile.dob : undefined; // teen DOB lives in TeenPrivateData, not TeenProfile

      const individual = {};
      if (firstName) individual.first_name = firstName;
      if (lastName) individual.last_name = lastName;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          individual.dob = { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
        }
      }
      if (isParent && profile.address) {
        individual.address = {
          line1: profile.address,
          postal_code: profile.zip || undefined,
        };
      }

      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        individual: Object.keys(individual).length ? individual : undefined,
        business_profile: {
          name: 'Blockwork',
          product_description: 'Local neighborhood services (lawn care, tutoring, pet sitting, tech help, odd jobs) facilitated through the Blockwork marketplace platform.',
        },
        capabilities: { transfers: { requested: true } },
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id: user.id,
          subject: isParent ? 'parent' : 'teen',
        },
      });
      await updateEntity.update(profile.id, {
        stripe_connect_account_id: account.id,
        connect_status: 'pending',
        payout_account_created_at: new Date().toISOString(),
      });
      return account.id;
    };

    let accountId = profile.stripe_connect_account_id;
    // Clear simulated/stale account IDs that don't exist in the current Stripe mode
    if (accountId && (accountId.includes('simulated') || accountId.includes('test_blockwork'))) {
      accountId = null;
    }
    if (!accountId) {
      accountId = await createAccount();
    }

    let link;
    try {
      link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}${returnPath}?connect=refresh`,
        return_url: `${origin}${returnPath}?connect=return`,
        type: 'account_onboarding',
      });
    } catch (linkErr) {
      // The stored account may not exist in the current Stripe mode (e.g. a
      // test account ID used with live keys). Create a fresh account and retry.
      if (linkErr.message?.includes('No such account') || linkErr.code === 'resource_missing') {
        accountId = await createAccount();
        link = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${origin}${returnPath}?connect=refresh`,
          return_url: `${origin}${returnPath}?connect=return`,
          type: 'account_onboarding',
        });
      } else {
        throw linkErr;
      }
    }

    return Response.json({ url: link.url });
  } catch (error) {
    console.error('createConnectOnboarding error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});