import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isRecheckFresh, markVerifiedNow, verifyCurrentPassword, RECHECK_WINDOW_MS } from '../../shared/recheck.ts';

// The "prove it's you" step before a sensitive change. Two actions:
//   status  — should the app ask for a password right now?
//   verify  — check the password just typed and start a fresh 15-minute window.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, password } = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const authMethod = String(user.auth_method || 'password').toLowerCase();
    const fresh = await isRecheckFresh(svc, user.id);

    if (action === 'status') {
      return Response.json({
        needed: !fresh,
        method: authMethod === 'password' ? 'password' : 'provider',
        provider: authMethod === 'password' ? null : authMethod,
        windowMinutes: RECHECK_WINDOW_MS / 60000,
      });
    }

    if (action === 'verify') {
      if (authMethod !== 'password') {
        return Response.json({
          error: 'This account signs in with a provider. Please sign in again to continue.',
          code: 'provider_recheck',
          provider: authMethod,
        }, { status: 400 });
      }
      const check = await verifyCurrentPassword(base44, user.email, String(password || ''));
      if (!check.ok) return Response.json({ error: check.error, code: 'bad_password' }, { status: 401 });
      await markVerifiedNow(svc, user.id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error: any) {
    console.error('accountRecheck error:', error?.message || error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});