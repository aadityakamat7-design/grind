import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { loadAccountSettings, normalizeNotifications } from '../../shared/accountPrefs.ts';
import { isRecheckFresh } from '../../shared/recheck.ts';
import { fetchStripeAccountName } from '../../shared/stripeAccount.ts';

// One read that gives the Account information screen everything it needs for
// the signed-in account — and nothing about anybody else. Runs with the service
// role so each role's fields can be assembled server-side, but every lookup is
// scoped to the caller's own id.

function ageFrom(dob?: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function lockedFields(role: string, opts: { teenDobLocked?: boolean; dobLockedByStripe?: boolean; hasTeenLink?: boolean }) {
  const locked: { field: string; why: string; help: string }[] = [
    {
      field: 'Sign-in email',
      why: 'Your sign-in email is your account ID, so it can\'t be edited here.',
      help: 'Contact support and we\'ll move your account to a new address after verifying it\'s you.',
    },
    {
      field: 'Role',
      why: `Changing your role would break your ${role === 'teen' ? 'linked parent' : 'linked accounts'} and your bookings.`,
      help: 'Contact support through Help — we\'ll review it and change it for you.',
    },
  ];

  if (role === 'teen') {
    locked.push({
      field: 'Date of birth',
      why: opts.teenDobLocked
        ? 'Your parent confirmed your date of birth, and every age rule depends on it.'
        : 'Date of birth is set at sign-up and age rules depend on it.',
      help: 'Ask your parent to request a correction through Help. Our team updates it and re-checks your services and upcoming jobs.',
    });
    locked.push({
      field: 'Linked parent',
      why: 'Your parent is linked for safety, so only they (or our team) can change it.',
      help: 'Your parent can unlink from their account. A different parent can link using your invite code.',
    });
  }

  if (role === 'parent' || role === 'teen') {
    if (opts.dobLockedByStripe) {
      locked.push({
        field: 'Legal name and date of birth (payout)',
        why: 'Stripe verified these when your payout account was set up, so they can\'t be edited here.',
        help: 'Update them in Stripe from your Payouts section, or contact support through Help.',
      });
    }
  }

  return locked;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const role = String(user.app_role || '').toLowerCase();
    const settings = await loadAccountSettings(svc, user.id);
    const authMethod = String(user.auth_method || 'password').toLowerCase();

    const payload: any = {
      identity: {
        user_id: user.id,
        full_name: user.full_name || '',
        signin_email: user.email || '',
        contact_email: user.contact_email || '',
        phone: settings?.phone || user.recovery_phone || '',
        photo_url: settings?.photo_url || '',
        auth_method: authMethod,
        has_password: authMethod === 'password',
        role,
        account_status: user.account_status || 'active',
        account_status_reason: user.account_status_reason || '',
        member_since: user.created_date || '',
      },
      preferences: normalizeNotifications(settings?.notifications),
      recheck: {
        needed: !(await isRecheckFresh(svc, user.id)),
        method: authMethod === 'password' ? 'password' : 'provider',
        provider: authMethod === 'password' ? null : authMethod,
      },
      profile: {},
      locked: [],
      payout: null,
      addresses: [],
      teens: [],
    };

    // ---- Neighbor (and anyone who also hires) ----
    if (role === 'buyer' || user.has_buyer_profile) {
      const profiles = await svc.BuyerProfile.filter({ user_id: user.id });
      const rows = await svc.SavedAddress.filter({ user_id: user.id }, '-is_default');
      payload.profile.buyer = {
        full_name: profiles[0]?.full_name || user.full_name || '',
        description: profiles[0]?.description || '',
        credit_balance: profiles[0]?.credit_balance || 0,
      };
      payload.addresses = rows.map((a: any) => ({
        id: a.id,
        label: a.label || 'Home',
        address: a.address,
        zip: a.zip,
        city: a.city || '',
        state: a.state || '',
        job_notes: a.job_notes || '',
        is_default: !!a.is_default,
      }));
    }

    // ---- Teen / independent ----
    if (role === 'teen') {
      const [profiles, privates, links] = await Promise.all([
        svc.TeenProfile.filter({ user_id: user.id }),
        svc.TeenPrivateData.filter({ user_id: user.id }),
        svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' }),
      ]);
      const p = profiles[0] || {};
      const pd = privates[0] || {};
      const link = links[0] || null;
      payload.profile.teen = {
        display_name: p.display_name || '',
        legal_name: pd.legal_name || '',
        bio: p.bio || '',
        photo_url: p.photo_url || '',
        skills: p.skills || [],
        is_available: p.is_available !== false,
        service_radius_miles: p.service_radius_miles ?? 3,
        zip: pd.zip || '',
        city: p.resolved_city || '',
        state: p.state || '',
        date_of_birth: pd.verified_dob || pd.date_of_birth || '',
        age: ageFrom(pd.verified_dob || pd.date_of_birth),
        status: p.status || 'active',
        parent: link
          ? { link_id: link.id, name: link.teen_display_name ? '' : '', parent_user_id: link.parent_user_id }
          : null,
        is_minor: !!link,
      };
      if (link?.parent_user_id) {
        const parents = await svc.User.filter({ id: link.parent_user_id });
        payload.profile.teen.parent = { link_id: link.id, parent_user_id: link.parent_user_id, name: parents[0]?.full_name || '' };
      }
      payload.payout = {
        connect_status: p.connect_status || 'not_setup',
        bank_last4: p.bank_last4 || '',
        bank_name: p.bank_name || '',
        stripe_name: await fetchStripeAccountName(p.stripe_connect_account_id),
      };
    }

    // ---- Parent ----
    if (role === 'parent') {
      const [profiles, links, parentProfile] = await Promise.all([
        svc.ParentProfile.filter({ user_id: user.id }),
        svc.ParentTeenLink.filter({ parent_user_id: user.id, status: 'confirmed' }),
        svc.ParentProfile.filter({ user_id: user.id }),
      ]);
      const p = profiles[0] || {};
      payload.profile.parent = {
        full_name: p.full_name || user.full_name || '',
        description: p.description || '',
      };
      payload.payout = {
        connect_status: parentProfile[0]?.connect_status || 'not_setup',
        bank_last4: parentProfile[0]?.bank_last4 || '',
        bank_name: parentProfile[0]?.bank_name || '',
        stripe_name: await fetchStripeAccountName(parentProfile[0]?.stripe_connect_account_id),
      };
      const teens = await Promise.all(links.map(async (link: any) => {
        const [tp, tpd] = await Promise.all([
          svc.TeenProfile.filter({ user_id: link.teen_user_id }),
          svc.TeenPrivateData.filter({ user_id: link.teen_user_id }),
        ]);
        const teen = tp[0] || {};
        const dob = tpd[0]?.verified_dob || tpd[0]?.date_of_birth || '';
        return {
          link_id: link.id,
          teen_user_id: link.teen_user_id,
          name: teen.display_name || link.teen_display_name || 'Your teen',
          photo_url: teen.photo_url || '',
          bio: teen.bio || '',
          age: ageFrom(dob),
          status: teen.status || 'active',
          withdrawals_locked: !!link.withdrawals_locked,
          limits: link.limits || {},
        };
      }));
      payload.teens = teens;
    }

    if (role === 'admin') {
      payload.profile.admin = { full_name: user.full_name || '' };
    }

    const dobLockedByStripe = ['parent', 'teen'].includes(role)
      && !!(payload.payout?.connect_status && payload.payout.connect_status !== 'not_setup')
      && !!payload.payout?.stripe_name;

    payload.locked = lockedFields(role, {
      teenDobLocked: role === 'teen' && !!payload.profile.teen?.parent,
      dobLockedByStripe,
    });

    return Response.json(payload);
  } catch (error: any) {
    console.error('getAccountInfo error:', error?.message || error);
    return Response.json({ error: 'Could not load your account details. Please try again.' }, { status: 500 });
  }
});