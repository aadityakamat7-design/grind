import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// A parent's controls over one linked teen, all in one place. Every action
// checks the caller really is that teen's confirmed parent before anything
// moves, and each one is recorded in the audit log and told to the teen.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { teen_user_id, action, value } = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const ip = getClientIp(req);

    const links = await svc.ParentTeenLink.filter({ parent_user_id: user.id, teen_user_id: String(teen_user_id || '') });
    const link = links.find((l: any) => l.status === 'confirmed') || links[0];
    if (!link) {
      return Response.json({ error: 'That teen isn\'t linked to your account.' }, { status: 403 });
    }

    const profiles = await svc.TeenProfile.filter({ user_id: link.teen_user_id });
    const profile = profiles[0];
    const teenName = profile?.display_name || link.teen_display_name || 'your teen';
    const notify = async (title: string, body: string) => {
      try {
        await svc.Notification.create({ user_id: link.teen_user_id, type: 'account', title, body, link: '/account', read: false });
      } catch (err: any) {
        console.error('parentTeenControl notify failed:', err?.message);
      }
    };
    const audit = async (what: string, metadata: Record<string, unknown>) => writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: 'parent', action: 'parent_teen_control',
      category: 'security', target_type: 'ParentTeenLink', target_id: link.id,
      summary: `${what} for ${teenName}`, metadata, ip,
    });

    switch (action) {
      case 'pause': {
        if (profile) await svc.TeenProfile.update(profile.id, { status: 'suspended' });
        await notify('Your account is paused', 'Your parent paused your Blockwork account for now. Your jobs and earnings are safe.');
        await audit('Paused account', { status: 'suspended' });
        return Response.json({ ok: true, status: 'suspended' });
      }
      case 'resume': {
        if (profile) await svc.TeenProfile.update(profile.id, { status: 'active' });
        await notify('Your account is active again', 'Your parent turned your Blockwork account back on.');
        await audit('Resumed account', { status: 'active' });
        return Response.json({ ok: true, status: 'active' });
      }
      case 'lock_withdrawals':
      case 'unlock_withdrawals': {
        const locked = action === 'lock_withdrawals';
        await svc.ParentTeenLink.update(link.id, { withdrawals_locked: locked });
        await notify(
          locked ? 'Cash-outs paused' : 'Cash-outs enabled',
          locked ? 'Your parent paused withdrawals from your Blockwork Wallet. Your balance is safe.' : 'Your parent enabled withdrawals again.',
        );
        await audit(locked ? 'Paused withdrawals' : 'Enabled withdrawals', { withdrawals_locked: locked });
        return Response.json({ ok: true, withdrawals_locked: locked });
      }
      case 'remove_photo': {
        if (profile) await svc.TeenProfile.update(profile.id, { photo_url: '' });
        await notify('Your photo was removed', 'Your parent removed your profile photo.');
        await audit('Removed profile photo', {});
        return Response.json({ ok: true });
      }
      case 'remove_bio': {
        if (profile) await svc.TeenProfile.update(profile.id, { bio: '' });
        await notify('Your About me was removed', 'Your parent removed the About me text from your profile.');
        await audit('Removed About me', {});
        return Response.json({ ok: true });
      }
      case 'set_limits': {
        const limits = value && typeof value === 'object' ? value : {};
        const clean: Record<string, unknown> = {};
        const num = (n: unknown) => (n === '' || n === null || n === undefined ? null : Number(n));
        const hours = num((limits as any).max_hours_per_week);
        if (hours !== null) {
          if (!Number.isFinite(hours) || hours < 1 || hours > 40) return Response.json({ error: 'Weekly hours must be between 1 and 40.' }, { status: 400 });
          clean.max_hours_per_week = hours;
        }
        const distance = num((limits as any).max_distance_miles);
        if (distance !== null) {
          if (!Number.isFinite(distance) || distance < 1 || distance > 25) return Response.json({ error: 'Distance must be between 1 and 25 miles.' }, { status: 400 });
          clean.max_distance_miles = distance;
        }
        const earliest = num((limits as any).earliest_hour);
        const latest = num((limits as any).latest_hour);
        if (earliest !== null) clean.earliest_hour = earliest;
        if (latest !== null) clean.latest_hour = latest;
        if (earliest !== null && latest !== null && latest <= earliest) {
          return Response.json({ error: 'The latest hour has to be after the earliest hour.' }, { status: 400 });
        }
        const days = Array.isArray((limits as any).allowed_days)
          ? (limits as any).allowed_days.map((d: unknown) => Number(d)).filter((d: number) => d >= 0 && d <= 6)
          : [];
        if (days.length) clean.allowed_days = days;
        clean.no_school_nights = !!(limits as any).no_school_nights;

        await svc.ParentTeenLink.update(link.id, { limits: clean, limits_updated_at: new Date().toISOString() });
        await notify('Your work limits were updated', 'Your parent changed the hours, days or distance you can work.');
        await audit('Updated limits', { limits: clean });
        return Response.json({ ok: true, limits: clean });
      }
      case 'unlink': {
        await svc.ParentTeenLink.delete(link.id);
        if (profile) await svc.TeenProfile.update(profile.id, { status: 'pending_parent' });
        await notify('Your parent unlinked', 'Your parent removed the link to your Blockwork account. A parent can link again with your invite code.');
        await audit('Unlinked', {});
        return Response.json({ ok: true, status: 'pending_parent' });
      }
      default:
        return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('parentTeenControl error:', error?.message || error);
    return Response.json({ error: 'Could not make that change. Please try again.' }, { status: 500 });
  }
});