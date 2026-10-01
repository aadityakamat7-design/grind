import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SIGNUP_ROLES, calcAge, checkRoleAge } from '../../shared/signupRules.ts';

// Attaches the age check to the signed-in account. Called right after sign-in
// (email code, Google, Apple or Facebook) with either:
//   - the one-time token from startSignup, or
//   - a role + date of birth typed again, when the token is missing or expired.
// The role and age are checked AGAIN here — a token is never trusted on its own.
//
// Sets signup_role, date_of_birth and onboarding_step = account_created. A
// finished account is left untouched, so signing in with Google / Apple /
// Facebook against an existing email just signs the person in — it never
// creates a second account or changes the role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Existing, finished account → straight to the dashboard.
    if (user.app_role && user.onboarded) {
      return Response.json({ existing: true, role: user.app_role });
    }

    // Already past the age check (page reload, second device): nothing to redo.
    if (user.signup_claimed_at && user.onboarding_step && user.onboarding_step !== 'account_created') {
      return Response.json({ ok: true, role: user.signup_role, step: user.onboarding_step });
    }

    const body: any = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;

    let role = '';
    let dob = '';
    let pendingId = '';

    if (body?.token) {
      const found = await svc.PendingSignup.filter({ token: String(body.token) });
      const p = found[0];
      const expired = !p || p.consumed_at || new Date(p.expires_at).getTime() < Date.now();
      if (expired) {
        return Response.json(
          { error: 'Your sign-up session expired. Please confirm who you are and your date of birth again.', code: 'expired' },
          { status: 410 },
        );
      }
      role = p.role;
      dob = p.date_of_birth;
      pendingId = p.id;
    } else {
      role = String(body?.role || '').toLowerCase().trim();
      dob = String(body?.dateOfBirth || '').trim();
    }

    if (!SIGNUP_ROLES.includes(role)) {
      return Response.json({ error: 'Choose who you are to continue.', code: 'bad_role' }, { status: 400 });
    }
    const age = calcAge(dob);
    if (age === null) return Response.json({ error: 'Enter a valid date of birth.', code: 'bad_dob' }, { status: 400 });
    const blocked = checkRoleAge(role, age);
    if (blocked) return Response.json(blocked, { status: 400 });

    // A role is fixed once the profile is saved.
    if (user.app_role && user.app_role !== role) {
      return Response.json({ error: 'Your account already has a role.' }, { status: 403 });
    }

    await svc.User.update(user.id, {
      signup_role: role,
      date_of_birth: dob,
      ...(role === 'teen' ? { work_state: 'CA' } : {}),
      signup_claimed_at: new Date().toISOString(),
      onboarding_step: 'account_created',
    });
    if (pendingId) await svc.PendingSignup.update(pendingId, { consumed_at: new Date().toISOString() });

    return Response.json({ ok: true, role, step: 'account_created', independent: role === 'teen' && age >= 18 });
  } catch (error: any) {
    console.error('claimSignup failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});