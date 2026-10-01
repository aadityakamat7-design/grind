import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SIGNUP_ROLES, calcAge, checkRoleAge } from '../../shared/signupRules.ts';
import { cleanCode, cleanDest, clientIp } from '../../shared/entryIntent.ts';

// Saves what must survive a sign-in redirect, under a one-time token:
//   - the age check (role + date of birth), when the person has done it, and
//   - a parent invite code and/or the page they were heading to.
// The token rides through the Google / Apple / Facebook redirect in the URL and
// is attached to the account by claimSignup — browser storage, which iPhone often
// wipes during a redirect, is never relied on.
//
// With a role + date of birth the age rules are checked here and nothing is saved
// when they fail (under 13, wrong age for the role). With neither, the token only
// carries the invite code / destination.
const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body: any = await req.json().catch(() => ({}));
    const role = String(body?.role || '').toLowerCase().trim();
    const dob = String(body?.dateOfBirth || '').trim();
    const code = cleanCode(body?.code);
    const dest = cleanDest(body?.dest);
    const hasAgeCheck = !!(role || dob);

    let independent = false;
    if (hasAgeCheck) {
      if (!SIGNUP_ROLES.includes(role)) {
        return Response.json({ error: 'Choose who you are to continue.', code: 'bad_role' }, { status: 400 });
      }
      const age = calcAge(dob);
      if (age === null) {
        return Response.json({ error: 'Enter a valid date of birth.', code: 'bad_dob' }, { status: 400 });
      }
      const blocked = checkRoleAge(role, age);
      if (blocked) return Response.json(blocked, { status: 400 });
      // An invite link is for a parent account — nothing else may use its code.
      if (code && role !== 'parent') {
        return Response.json(
          { error: 'This invite link is for a parent account.', code: 'role_locked' },
          { status: 400 },
        );
      }
      independent = role === 'teen' && age >= 18;
    } else if (!code && !dest) {
      return Response.json({ error: 'Choose who you are to continue.', code: 'bad_role' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const ip = clientIp(req);
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const recent = await svc.PendingSignup.filter({ ip, created_date: { $gte: since } }, '-created_date', RATE_MAX + 1);
    if (recent.length >= RATE_MAX) {
      return Response.json({ error: 'Too many attempts. Please try again in a few minutes.', code: 'rate_limited' }, { status: 429 });
    }

    const token = randomToken();
    await svc.PendingSignup.create({
      token,
      ...(hasAgeCheck ? { role, date_of_birth: dob } : {}),
      ...(code ? { invite_code: code } : {}),
      ...(dest ? { destination: dest } : {}),
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      ip,
    });

    // Housekeeping: drop tokens that expired more than an hour ago.
    await svc.PendingSignup.deleteMany({ expires_at: { $lt: new Date(Date.now() - 3600000).toISOString() } }).catch(() => {});

    return Response.json({ token, independent, expiresInSeconds: TOKEN_TTL_MS / 1000 });
  } catch (error: any) {
    console.error('startSignup failed:', error?.message || error);
    return Response.json({ error: "Couldn't start sign-up. Check your connection and try again." }, { status: 500 });
  }
});