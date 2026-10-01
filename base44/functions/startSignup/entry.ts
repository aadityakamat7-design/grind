import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { SIGNUP_ROLES, calcAge, checkRoleAge } from '../../shared/signupRules.ts';

// Step 1 of sign-up, before any account exists. The browser sends the role the
// person picked and their date of birth; the server checks the age rules and,
// only when they pass, keeps the result for 15 minutes under a one-time token.
// The token rides through the Google / Apple / Facebook redirect in the URL and
// is attached to the new account by claimSignup — browser storage, which iPhone
// often wipes during a redirect, is never relied on.
//
// Nothing is saved when the check fails (under 13, wrong age for the role).
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

    if (!SIGNUP_ROLES.includes(role)) {
      return Response.json({ error: 'Choose who you are to continue.', code: 'bad_role' }, { status: 400 });
    }
    const age = calcAge(dob);
    if (age === null) {
      return Response.json({ error: 'Enter a valid date of birth.', code: 'bad_dob' }, { status: 400 });
    }
    const blocked = checkRoleAge(role, age);
    if (blocked) return Response.json(blocked, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const recent = await svc.PendingSignup.filter({ ip, created_date: { $gte: since } }, '-created_date', RATE_MAX + 1);
    if (recent.length >= RATE_MAX) {
      return Response.json({ error: 'Too many attempts. Please try again in a few minutes.', code: 'rate_limited' }, { status: 429 });
    }

    const token = randomToken();
    await svc.PendingSignup.create({
      token,
      role,
      date_of_birth: dob,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      ip,
    });

    // Housekeeping: drop sign-ups that expired more than an hour ago.
    await svc.PendingSignup.deleteMany({ expires_at: { $lt: new Date(Date.now() - 3600000).toISOString() } }).catch(() => {});

    return Response.json({ token, independent: role === 'teen' && age >= 18, expiresInSeconds: TOKEN_TTL_MS / 1000 });
  } catch (error: any) {
    console.error('startSignup failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});