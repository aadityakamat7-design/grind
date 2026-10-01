import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validatePassword } from '../../shared/passwordPolicy.ts';
import { requireRecheck, markVerifiedNow } from '../../shared/recheck.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { createAccountAlert, sendChangeNotice } from '../../shared/accountEmails.ts';

// Password changes. Two shapes:
//   accounts that sign in with a password — current password + new password
//   accounts that only sign in with Google/Apple/Facebook — they add a password
//   by setting one from a link we email them (the same flow as "forgot
//   password"), so the platform's own reset is the single place a password is set.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const ip = getClientIp(req);
    const origin = getSafeOrigin(req);
    const authMethod = String(user.auth_method || 'password').toLowerCase();

    // Provider-only account: send the "set a password" link instead.
    if (body.action === 'request_set_link') {
      try {
        await base44.auth.resetPasswordRequest(user.email);
      } catch (err: any) {
        console.error('request_set_link failed:', err?.message);
      }
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: user.app_role || 'user', action: 'account_password_set_link_sent',
        category: 'security', target_type: 'User', target_id: user.id,
        summary: 'Sent a link to add password sign-in', metadata: { auth_method: authMethod }, ip,
      });
      return Response.json({
        ok: true,
        message: `We emailed ${user.email} a link. Open it to choose a password — after that you can sign in with either ${authMethod} or your email and password.`,
      });
    }

    const newPassword = String(body.new_password || '');
    const check = validatePassword(newPassword);
    if (!check.valid) return Response.json({ error: check.error }, { status: 400 });

    if (authMethod !== 'password') {
      return Response.json({
        error: 'This account signs in with a provider. Use "Add a password" and we\'ll email you a link to set one.',
        code: 'provider_account',
      }, { status: 400 });
    }

    const gate = await requireRecheck(base44, svc, user, body.current_password, 'changing your password');
    if (!gate.ok) return Response.json({ error: gate.error, code: gate.code }, { status: gate.status });

    try {
      await base44.auth.changePassword({
        userId: user.id,
        currentPassword: String(body.current_password || ''),
        newPassword,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || err?.message || '';
      console.error('changePassword failed:', message);
      return Response.json({
        error: /current password/i.test(message) ? 'That current password is not correct.' : 'We couldn\'t change your password. Please try again.',
      }, { status: 401 });
    }

    await markVerifiedNow(svc, user.id);

    const token = await createAccountAlert(svc, { userId: user.id, changeType: 'password', detail: 'your password was changed' });
    await sendChangeNotice(base44, {
      to: user.contact_email || user.email,
      name: user.full_name,
      what: 'password',
      detail: 'your password was changed',
      token,
      origin,
    });
    await writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: user.app_role || 'user', action: 'account_password_changed',
      category: 'security', target_type: 'User', target_id: user.id,
      summary: 'Password changed', metadata: { auth_method: authMethod }, ip,
    });
    await svc.Notification.create({
      user_id: user.id,
      type: 'account',
      title: 'Your password was changed',
      body: 'If you didn\'t change it, open the email we just sent you and tap "this wasn\'t me".',
      link: '/account',
      read: false,
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('accountPassword error:', error?.message || error);
    return Response.json({ error: 'Could not change your password. Please try again.' }, { status: 500 });
  }
});