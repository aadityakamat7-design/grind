import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { cleanEmail, clientIp, overLimit } from '../../shared/entryIntent.ts';

// The one question the entry screen asks: "does this email already have an
// account, and if so how did it sign up?" The answer decides whether the person
// sees the password screen, the sign-up steps, or a "use Google" notice — so no
// one is ever told they have an account when they don't, or sent to sign up when
// they do.
//
// Limited to 10 checks a minute per IP so it can't be used to test lists of emails.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body: any = await req.json().catch(() => ({}));
    const email = cleanEmail(body?.email);
    if (!email) {
      return Response.json({ error: 'Enter a valid email address.', code: 'bad_email' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    if (await overLimit(svc, clientIp(req), 'check-email', 10, 60 * 1000)) {
      return Response.json(
        { error: 'Too many email checks. Wait a minute and try again.', code: 'rate_limited' },
        { status: 429 },
      );
    }

    const found = await svc.User.filter({ email });
    const account = found[0];
    if (!account) return Response.json({ status: 'new' });
    return Response.json({ status: 'existing', method: account.auth_method || 'unknown' });
  } catch (error: any) {
    console.error('checkEmail failed:', error?.message || error);
    return Response.json({ error: "Couldn't check that email right now. Try again in a moment." }, { status: 500 });
  }
});