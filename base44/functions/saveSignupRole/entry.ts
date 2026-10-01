import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SIGNUP_ROLES, calcAge } from '../../shared/signupRules.ts';

// Saves the profile step of sign-up and grants the account its role. This is the
// ONLY place app_role is set. The role and date of birth come from the age check
// that claimSignup attached to the account — the browser cannot change them here —
// and the server re-checks every rule (name, California ZIP) before writing.
//
// Order is enforced with onboarding_step:
//   account_created → profile_complete → parent_link_shown (teens under 18 and
//   parents) → done. Neighbors and independent 18+ teens go straight to done.

function isCaliforniaZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  const n = Number(zip);
  return n >= 90001 && n <= 96162;
}

function isRealName(value: string, email: string): boolean {
  const v = String(value || '').trim();
  if (v.length < 2 || v.length > 60) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;
  if (!/^[A-Za-z][A-Za-z'’.\- ]*$/.test(v)) return false;
  const username = String(email || '').split('@')[0].trim().toLowerCase();
  if (username && v.toLowerCase() === username) return false;
  return true;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body: any = await req.json().catch(() => ({}));
    const role = String(body?.role || '').toLowerCase().trim();
    if (!SIGNUP_ROLES.includes(role)) {
      return Response.json({ error: 'Choose a valid account type.' }, { status: 400 });
    }

    // The role is set once and never swapped.
    const existingRole = String(user.app_role || '').toLowerCase();
    if (existingRole && existingRole !== role) {
      return Response.json({ error: 'Your account already has a role.' }, { status: 403 });
    }
    if (existingRole === role && user.onboarding_step !== 'account_created') {
      return Response.json({ ok: true, role, alreadySet: true, step: user.onboarding_step || 'done' });
    }

    // The age check must have been passed and attached to this account.
    if (!user.signup_claimed_at || !user.signup_role) {
      return Response.json(
        { error: 'Please confirm who you are and your date of birth first.', code: 'needs_age_check' },
        { status: 403 },
      );
    }
    if (user.signup_role !== role) {
      return Response.json({ error: 'That is not the account type you signed up for.' }, { status: 403 });
    }

    // Age always comes from the account, never from the request.
    const age = calcAge(user.date_of_birth);
    if (age === null) {
      return Response.json({ error: 'Please confirm your date of birth first.', code: 'needs_age_check' }, { status: 403 });
    }

    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const zip = String(body?.zip || '').trim();

    if (role === 'teen') {
      if (age < 13) return Response.json({ error: 'You need to be 13 or older to use Blockwork.' }, { status: 400 });
      if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
        return Response.json({ error: 'Enter your real first and last name — letters only, not your email address.' }, { status: 400 });
      }
      if (!isCaliforniaZip(zip)) {
        return Response.json({ error: 'Enter a 5-digit California ZIP code.' }, { status: 400 });
      }
    } else {
      if (age < 18) return Response.json({ error: 'You must be at least 18 years old for this account type.' }, { status: 400 });
      if (role === 'parent' && !isRealName(firstName, user.email)) {
        return Response.json({ error: 'Enter your legal first and last name — letters only.' }, { status: 400 });
      }
      if (role === 'buyer') {
        if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
          return Response.json({ error: 'Enter your first and last name — letters only, not your email address.' }, { status: 400 });
        }
        if (!isCaliforniaZip(zip)) {
          return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 400 });
        }
      }
    }

    const needsParentLinkStep = (role === 'teen' && age < 18) || role === 'parent';
    const nextStep = needsParentLinkStep ? 'profile_complete' : 'done';

    await base44.asServiceRole.entities.User.update(user.id, {
      app_role: role,
      onboarding_step: nextStep,
      onboarded: nextStep === 'done',
    });

    return Response.json({ ok: true, role, step: nextStep });
  } catch (error: any) {
    console.error('saveSignupRole failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong saving your account type.' }, { status: 500 });
  }
}