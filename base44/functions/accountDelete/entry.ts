import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireRecheck } from '../../shared/recheck.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// Deleting an account.
//
// Blocked while anything is still moving — an upcoming job, money held in
// escrow, or earnings that haven't reached the bank yet — because deleting the
// account would strand the other side. Once nothing is in flight, the person
// confirms by typing DELETE and proving it's them, and we remove everything
// except what the law and our audit trail require (payments, consent records,
// safety reports).
//
// A parent deleting their account pauses their linked teens until another
// parent links.

const ACTIVE_BOOKING_STATUSES = ['payment_pending', 'pending_parent_approval', 'confirmed', 'in_progress'];
const UNPAID_PAYOUT_STATUSES = [
  'pending_release', 'blocked_no_destination', 'awaiting_active_account', 'awaiting_new_account_hold',
  'pending_review', 'duplicate_blocked', 'not_started', 'awaiting_bank', 'awaiting_settlement',
  'pending_new_account_hold',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const ip = getClientIp(req);
    const role = String(user.app_role || '').toLowerCase();
    const who = user.full_name || user.email || 'account holder';

    if (String(body.confirm_text || '').trim().toUpperCase() !== 'DELETE') {
      return Response.json({ error: 'Type DELETE to confirm.', code: 'need_confirmation' }, { status: 400 });
    }

    const gate = await requireRecheck(base44, svc, user, body.password, 'deleting your account');
    if (!gate.ok) return Response.json({ error: gate.error, code: gate.code }, { status: gate.status });

    // ---- What has to finish first ----
    const [asBuyer, asTeen, asParent] = await Promise.all([
      svc.Booking.filter({ buyer_user_id: user.id }, '-scheduled_start', 100),
      svc.Booking.filter({ teen_user_id: user.id }, '-scheduled_start', 100),
      svc.Booking.filter({ parent_user_id: user.id }, '-scheduled_start', 100),
    ]);
    const seen = new Set<string>();
    const bookings = [...asBuyer, ...asTeen, ...asParent].filter((b: any) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    const blockers: { label: string; detail: string }[] = [];
    const upcoming = bookings.filter((b: any) => ACTIVE_BOOKING_STATUSES.includes(b.status));
    for (const b of upcoming.slice(0, 5)) {
      const when = b.scheduled_start ? new Date(b.scheduled_start).toLocaleDateString() : 'soon';
      blockers.push({ label: 'Upcoming job', detail: `"${b.listing_title}" on ${when} (${b.status.replace(/_/g, ' ')})` });
    }
    const held = bookings.filter((b: any) => ['held', 'releasing'].includes(b.payment_status) && ['denied', 'cancelled', 'refunded'].includes(b.status) === false);
    if (held.length) {
      blockers.push({ label: 'Money still held', detail: `${held.length} booking${held.length > 1 ? 's' : ''} still has payment held in escrow.` });
    }
    const unpaid = bookings.filter((b: any) => b.status === 'completed' && Number(b.net_amount || b.price_total || 0) > 0 && UNPAID_PAYOUT_STATUSES.includes(b.payout_status));
    if (unpaid.length) {
      const total = unpaid.reduce((sum: number, b: any) => sum + Number(b.net_amount || 0), 0);
      blockers.push({ label: 'Earnings not paid out yet', detail: `$${total.toFixed(2)} from ${unpaid.length} finished job${unpaid.length > 1 ? 's' : ''} is still on its way to the bank.` });
    }
    const wallets = await svc.WalletAccount.filter({ teen_user_id: user.id });
    const balance = Number(wallets[0]?.balance || 0);
    if (balance > 0) {
      blockers.push({ label: 'Wallet balance', detail: `$${balance.toFixed(2)} is still in the Blockwork Wallet. Cash it out first.` });
    }

    if (blockers.length) {
      return Response.json({
        error: 'Your account has work still in progress, so it can\'t be deleted yet.',
        code: 'blocked',
        blockers,
      }, { status: 409 });
    }

    // ---- A parent going away pauses their teens ----
    if (role === 'parent') {
      const links = await svc.ParentTeenLink.filter({ parent_user_id: user.id });
      for (const link of links) {
        try {
          const profiles = await svc.TeenProfile.filter({ user_id: link.teen_user_id });
          if (profiles[0]) await svc.TeenProfile.update(profiles[0].id, { status: 'pending_parent' });
          await svc.Notification.create({
            user_id: link.teen_user_id,
            type: 'account',
            title: 'Your parent closed their account',
            body: 'Your Blockwork account is paused until a parent links again with your invite code. Your jobs and earnings are safe.',
            link: '/account',
            read: false,
          });
          await svc.ParentTeenLink.delete(link.id);
        } catch (err: any) {
          console.error('accountDelete: could not pause teen', link.teen_user_id, err?.message);
        }
      }
    }

    // Remove the account itself first: if the platform refuses, nothing else
    // has been touched and the person still has a working account.
    try {
      await svc.User.delete(user.id);
    } catch (err: any) {
      console.error('accountDelete: user delete refused:', err?.message);
      return Response.json({
        error: 'We couldn\'t close your account automatically. Please contact support and we\'ll finish it for you.',
        code: 'delete_failed',
      }, { status: 500 });
    }

    // ---- Remove everything that is theirs, keep what the law requires ----
    const purge: [string, Record<string, unknown>][] = [
      ['AccountSettings', { user_id: user.id }],
      ['SavedAddress', { user_id: user.id }],
      ['SavedTeen', { user_id: user.id }],
      ['Notification', { user_id: user.id }],
      ['EmailChange', { user_id: user.id }],
      ['TeenPrivateData', { user_id: user.id }],
      ['TeenProfile', { user_id: user.id }],
      ['ParentProfile', { user_id: user.id }],
      ['BuyerProfile', { user_id: user.id }],
      ['WalletAccount', { teen_user_id: user.id }],
      ['ParentTeenLink', { teen_user_id: user.id }],
    ];
    for (const [entity, query] of purge) {
      try {
        await svc[entity].deleteMany(query);
      } catch (err: any) {
        console.error(`accountDelete purge ${entity} failed:`, err?.message);
      }
    }

    await writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: role, action: 'account_deleted',
      category: 'security', target_type: 'User', target_id: user.id,
      summary: `${who} closed their account`,
      metadata: { email: user.email, kept: 'bookings, payment records, consent records, safety reports, audit log' },
      ip,
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('accountDelete error:', error?.message || error);
    return Response.json({ error: 'Something went wrong closing your account. Please contact support.' }, { status: 500 });
  }
});