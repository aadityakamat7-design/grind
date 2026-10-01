import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// The "this wasn't me" link in a change notice. It is opened from an email, so
// it needs no sign-in — the one-time token from that email is the credential.
// Pressing it files an urgent report and alerts the safety team immediately.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const { token, note } = await req.json().catch(() => ({}));
    const ip = getClientIp(req);

    const clean = String(token || '').trim();
    if (!clean) return Response.json({ error: 'This link is missing its code.' }, { status: 400 });

    const rows = await svc.AccountAlert.filter({ token: clean });
    const alert = rows[0];
    if (!alert) {
      return Response.json({ error: 'This link isn\'t valid any more. If your account was changed without you, contact support straight away.' }, { status: 404 });
    }
    if (alert.reported_at) {
      return Response.json({ ok: true, already_reported: true, change_type: alert.change_type });
    }

    await svc.AccountAlert.update(alert.id, { reported_at: new Date().toISOString(), reported_ip: ip });

    const account = await svc.User.get(alert.user_id);
    const label = {
      email: 'Email address', name: 'Legal name', password: 'Password',
      address: 'Address', payout: 'Payout details', teen_control: 'Parent controls',
    }[alert.change_type as string] || 'Account details';

    await svc.Report.create({
      reporter_id: alert.user_id,
      reporter_name: account?.full_name || account?.email || 'Account holder',
      subject_id: alert.user_id,
      subject_name: account?.full_name || account?.email || '',
      reason: 'safety',
      severity: 'urgent',
      auto_flagged: false,
      details: `ACCOUNT CHANGE DISPUTED. ${label} was changed (${alert.detail || 'no detail recorded'}) and the account holder says it wasn't them.${note ? ` Their note: ${String(note).slice(0, 400)}` : ''} Reported from ${ip}.`,
      status: 'open',
    });

    await writeAuditLog(base44, {
      actor_user_id: alert.user_id, actor_role: 'user', action: 'account_change_reported',
      category: 'security', target_type: 'AccountAlert', target_id: alert.id,
      summary: `${label} change reported as not made by the account holder`,
      metadata: { change_type: alert.change_type, detail: alert.detail }, ip,
    });

    // Tell the safety team right away.
    try {
      const admins = await svc.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await svc.Notification.create({
          user_id: admin.id,
          type: 'report',
          title: '🚨 Account change reported as not theirs',
          body: `${account?.full_name || 'An account holder'} says the ${label.toLowerCase()} change wasn't them. Review it now.`,
          link: '/admin',
          read: false,
        });
        if (admin.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `Urgent: ${label} change disputed`,
            body: `${account?.full_name || 'An account holder'} (${account?.email || 'unknown email'}) reports that a ${label.toLowerCase()} change was not made by them.\n\nWhat changed: ${alert.detail || 'n/a'}\nReported from IP: ${ip}\n\nReview the account in the admin dashboard.`,
          });
        }
      }
    } catch (err: any) {
      console.error('reportAccountAlert admin alert failed:', err?.message);
    }

    return Response.json({ ok: true, change_type: alert.change_type });
  } catch (error: any) {
    console.error('reportAccountAlert error:', error?.message || error);
    return Response.json({ error: 'Something went wrong filing that report. Please contact support.' }, { status: 500 });
  }
});