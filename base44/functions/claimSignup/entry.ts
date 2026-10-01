import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SIGNUP_ROLES, calcAge, checkRoleAge } from '../../shared/signupRules.ts';
import { cleanCode, cleanDest, cleanMethod } from '../../shared/entryIntent.ts';

// The one call made right after every sign-in (email code, password, Google,
// Apple or Facebook). It attaches what was saved before the sign-in to the
// signed-in account and tells the browser where this person stands:
//
//   - finished account      → { existing: true, dest, code }: go to dest, else the dashboard
//   - age check attached    → { ok: true, step, dest, code }: resume at that sign-up step
//   - no age check yet      → { needsAge: true }: show the age screen
//
// Inputs (all optional): a one-time `token` from startSignup (age check, invite
// code, destination), a typed `role` + `dateOfBirth` when there is no token or it
// expired, the page they were heading to (`dest`), an invite `code`, and `am` —
// how they signed in. Role and age are checked AGAIN here; a token is never
// trusted on its own.
//
// A finished account is never changed, so signing in with Google / Apple /
// Facebook against an existing email just signs the person in — no second
// account, no role change.
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'You are signed out. Sign in again to continue.' }, { status: 401 });

    const body: any = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;

    // What was saved before sign-in.
    let pending: any = null;
    if (body?.token) {
      const found = await svc.PendingSignup.filter({ token: String(body.token) });
      pending = found[0] || null;
    }
    const pendingValid = !!pending && !pending.consumed_at && new Date(pending.expires_at).getTime() > Date.now();
    const pendingHasAgeCheck = !!pending?.role;

    const dest = cleanDest(pendingValid ? pending.destination : '') || cleanDest(body?.dest);
    const code = cleanCode(pendingValid ? pending.invite_code : '') || cleanCode(body?.code);

    // How they signed in — recorded once, and only on a brand-new account, so a
    // later "same email, different method" check can be truthful.
    const updates: Record<string, unknown> = {};
    const method = cleanMethod(body?.am);
    const isNewAccount = Date.now() - new Date(user.created_date).getTime() < NEW_ACCOUNT_WINDOW_MS;
    if (method && !user.auth_method && isNewAccount) updates.auth_method = method;

    const finished = !!(user.app_role && user.onboarded);
    const consume = async () => {
      if (pendingValid) await svc.PendingSignup.update(pending.id, { consumed_at: new Date().toISOString() });
    };

    // ---- Finished account: hand back where to go, and clear the saved values.
    if (finished) {
      const savedDest = cleanDest(user.saved_destination);
      const savedCode = cleanCode(user.pending_invite_code);
      if (user.saved_destination) updates.saved_destination = '';
      if (user.pending_invite_code) updates.pending_invite_code = '';
      if (Object.keys(updates).length) await svc.User.update(user.id, updates);
      await consume();
      return Response.json({ existing: true, role: user.app_role, dest: dest || savedDest, code: code || savedCode });
    }

    // ---- Unfinished account: remember the destination / invite code on the account.
    if (dest && dest !== user.saved_destination) updates.saved_destination = dest;
    if (code && code !== user.pending_invite_code) updates.pending_invite_code = code;
    const savedDest = dest || cleanDest(user.saved_destination);
    const savedCode = code || cleanCode(user.pending_invite_code);

    // Already past the age check (page reload, second device): nothing to redo.
    if (user.signup_claimed_at) {
      if (Object.keys(updates).length) await svc.User.update(user.id, updates);
      await consume();
      return Response.json({ ok: true, role: user.signup_role, step: user.onboarding_step, dest: savedDest, code: savedCode });
    }

    // ---- Not past the age check yet: find the role + date of birth.
    let role = '';
    let dob = '';
    if (pendingValid && pendingHasAgeCheck) {
      role = pending.role;
      dob = pending.date_of_birth;
    } else if (body?.role || body?.dateOfBirth) {
      role = String(body?.role || '').toLowerCase().trim();
      dob = String(body?.dateOfBirth || '').trim();
    } else if (pending && pendingHasAgeCheck && !pendingValid) {
      return Response.json(
        { error: 'Your sign-up session expired. Please confirm who you are and your date of birth again.', code: 'expired' },
        { status: 410 },
      );
    } else {
      // Nothing to attach yet — keep the destination / code and ask for the age check.
      if (Object.keys(updates).length) await svc.User.update(user.id, updates);
      await consume();
      return Response.json({ needsAge: true, dest: savedDest, code: savedCode });
    }

    if (!SIGNUP_ROLES.includes(role)) {
      return Response.json({ error: 'Choose who you are to continue.', code: 'bad_role' }, { status: 400 });
    }
    const age = calcAge(dob);
    if (age === null) return Response.json({ error: 'Enter a valid date of birth.', code: 'bad_dob' }, { status: 400 });

    const blocked = checkRoleAge(role, age);
    if (blocked) {
      // Under 13: this account should not exist. It is unfinished and unclaimed, so
      // remove it; the browser signs out and shows the message.
      if (blocked.code === 'underage') {
        let removed = false;
        try {
          await svc.User.delete(user.id);
          removed = true;
        } catch (err: any) {
          console.error('claimSignup: could not remove underage account:', err?.message || err);
        }
        return Response.json({ ...blocked, removed }, { status: 400 });
      }
      return Response.json(blocked, { status: 400 });
    }

    // An invite link is for a parent account — nothing else may claim its code.
    if (savedCode && role !== 'parent') {
      return Response.json(
        { error: 'This invite link is for a parent account. Sign out and continue as a parent.', code: 'role_locked' },
        { status: 400 },
      );
    }
    if (user.app_role && user.app_role !== role) {
      return Response.json({ error: 'Your account already has a different role.' }, { status: 403 });
    }

    await svc.User.update(user.id, {
      ...updates,
      signup_role: role,
      date_of_birth: dob,
      ...(role === 'teen' ? { work_state: 'CA' } : {}),
      signup_claimed_at: new Date().toISOString(),
      onboarding_step: 'account_created',
    });
    await consume();

    return Response.json({ ok: true, role, step: 'account_created', independent: role === 'teen' && age >= 18, dest: savedDest, code: savedCode });
  } catch (error: any) {
    console.error('claimSignup failed:', error?.message || error);
    return Response.json({ error: "Couldn't finish setting up your account. Check your connection and try again." }, { status: 500 });
  }
});