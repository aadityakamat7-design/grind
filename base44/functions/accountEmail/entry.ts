import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isValidEmail } from '../../shared/accountValidation.ts';
import { requireRecheck, markVerifiedNow } from '../../shared/recheck.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { createAccountAlert, sendChangeNotice, sendEmailChangeConfirmation } from '../../shared/accountEmails.ts';

// Changing the address Blockwork reaches you at. Nothing moves until the
// confirmation link is opened from the NEW address:
//   request — validate, prove it's you, email the new address a one-time link
//   confirm — apply the change, then tell the OLD address what happened with a
//             one-tap "this wasn't me" link

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const ip = getClientIp(req);
    const origin = getSafeOrigin(req);

    // ---- Confirm (the link in the email, opened signed in or out) ----
    if (body.action === 'confirm') {
      const token = String(body.token || '').trim();
      if (!token) return Response.json({ error: 'This link is missing its code.' }, { status: 400 });

      const rows = await svc.EmailChange.filter({ token });
      const change = rows[0];
      if (!change) return Response.json({ error: 'This link isn\'t valid any more. Ask for a new one from Settings.' }, { status: 404 });
      if (change.consumed_at) return Response.json({ error: 'This link has already been used.' }, { status: 409 });
      if (new Date(change.expires_at).getTime() < Date.now()) {
        return Response.json({ error: 'This link expired. Ask for a new one from Settings.' }, { status: 410 });
      }

      const target = await svc.User.get(change.user_id);
      if (!target) return Response.json({ error: 'That account no longer exists.' }, { status: 404 });

      await svc.User.update(change.user_id, { contact_email: change.new_email });

      // Try to move the account's sign-in address too, and report honestly
      // whether the platform accepted it.
      let loginMoved = false;
      try {
        await svc.User.update(change.user_id, { email: change.new_email });
        const check = await svc.User.get(change.user_id);
        loginMoved = String(check?.email || '').toLowerCase() === change.new_email.toLowerCase();
      } catch (err: any) {
        console.error('email confirm: sign-in address move refused:', err?.message);
      }

      await svc.EmailChange.update(change.id, {
        consumed_at: new Date().toISOString(),
        confirmed_from_ip: ip,
        applied: true,
        applied_to_login_email: loginMoved,
      });

      // Tell the address being replaced, with a one-tap "this wasn't me".
      const alertToken = await createAccountAlert(svc, {
        userId: change.user_id,
        changeType: 'email',
        detail: `your Blockwork email is now ${change.new_email}`,
      });
      await sendChangeNotice(base44, {
        to: change.old_email,
        name: target.full_name,
        what: 'email address',
        detail: `your Blockwork email is now ${change.new_email}`,
        token: alertToken,
        origin,
      });
      await writeAuditLog(base44, {
        actor_user_id: change.user_id, actor_role: target.app_role || 'user',
        action: 'account_email_changed', category: 'security',
        target_type: 'User', target_id: change.user_id,
        summary: `Email changed from ${change.old_email} to ${change.new_email}`,
        metadata: { before: change.old_email, after: change.new_email, sign_in_email_moved: loginMoved },
        ip,
      });
      await svc.Notification.create({
        user_id: change.user_id,
        type: 'account',
        title: 'Your email address was updated',
        body: `Blockwork now uses ${change.new_email}. If this wasn't you, open the notice we sent to your old address.`,
        link: '/account',
        read: false,
      });

      return Response.json({ ok: true, email: change.new_email, sign_in_email_moved: loginMoved });
    }

    // ---- Request (signed in) ----
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const newEmail = String(body.new_email || '').trim().toLowerCase();
    if (!isValidEmail(newEmail)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });

    const current = String(user.contact_email || user.email || '').toLowerCase();
    if (newEmail === current) {
      return Response.json({ error: 'That is already the email on your account.' }, { status: 400 });
    }

    const taken = await svc.User.filter({ email: newEmail });
    if (taken.length) {
      return Response.json({ error: 'That email already has a Blockwork account. Sign in with it instead.' }, { status: 409 });
    }

    const gate = await requireRecheck(base44, svc, user, body.password, 'changing your email');
    if (!gate.ok) return Response.json({ error: gate.error, code: gate.code, provider: gate.provider }, { status: gate.status });

    // Only one live request at a time.
    const previous = await svc.EmailChange.filter({ user_id: user.id, consumed_at: { $exists: false } });
    for (const row of previous) {
      await svc.EmailChange.update(row.id, { consumed_at: new Date().toISOString() });
    }

    const token = crypto.randomUUID().replace(/-/g, '');
    await svc.EmailChange.create({
      user_id: user.id,
      old_email: user.contact_email || user.email,
      new_email: newEmail,
      token,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      applied: false,
    });

    await sendEmailChangeConfirmation(base44, {
      to: newEmail,
      name: user.full_name,
      token,
      origin,
    });
    await markVerifiedNow(svc, user.id);

    return Response.json({ ok: true, sent_to: newEmail });
  } catch (error: any) {
    console.error('accountEmail error:', error?.message || error);
    return Response.json({ error: 'Could not start that email change. Please try again.' }, { status: 500 });
  }
});