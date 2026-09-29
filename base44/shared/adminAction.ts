// Shared foundation for every admin action.
//
// Rules enforced here so no individual function can forget them:
//   1. Only an admin may run an admin action (checked server-side, every call).
//   2. Every action carries a short reason, chosen before it runs.
//   3. Every action writes an immutable AdminAuditLog entry with the values
//      before and after.
//
// Nothing here writes business data — callers own their own state-machine work.
import { getClientIp } from './rateLimiter.ts';

const ADMIN_ONLY = { error: 'Admins only' };

// Verifies the caller is an admin. Returns { user, ip } on success, or
// { error: Response } ready to be returned straight from the handler.
export async function requireAdmin(base44, req) {
  const user = await base44.auth.me();
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  // The app tracks elevated access on the custom app_role field, with the
  // built-in role as a fallback.
  if (user.role !== 'admin' && user.app_role !== 'admin') {
    return { error: Response.json(ADMIN_ONLY, { status: 403 }) };
  }
  return { user, ip: getClientIp(req) };
}

// A reason is mandatory on every action. reason_code is the dropdown value,
// reason_note is the optional free-text detail.
export function readReason(body) {
  const reasonCode = String(body?.reason_code || '').trim();
  const reasonNote = String(body?.reason_note || '').trim().slice(0, 1000);
  if (!reasonCode) return { error: 'A reason is required for this action.' };
  return { reasonCode, reasonNote };
}

// Writes the audit entry. Called after the action succeeds so `after` is real.
// An audit failure must never hide a completed action, so it is logged loudly
// rather than thrown — the entry is still the compliance record of record.
export async function writeAdminAudit(base44, entry) {
  try {
    await base44.asServiceRole.entities.AdminAuditLog.create({
      admin_user_id: entry.admin.id,
      admin_email: entry.admin.email || '',
      admin_name: entry.admin.full_name || '',
      action: entry.action,
      action_group: entry.actionGroup || 'booking',
      target_type: entry.targetType || 'Booking',
      target_id: entry.targetId || '',
      booking_id: entry.bookingId || '',
      subject_user_id: entry.subjectUserId || '',
      reason_code: entry.reasonCode,
      reason_note: entry.reasonNote || '',
      before: entry.before || {},
      after: entry.after || {},
      refund_amount: Number(entry.refundAmount) || 0,
      stripe_refs: entry.stripeRefs || {},
      requester_verified: entry.requesterVerified === true,
      summary: entry.summary || '',
      ip: entry.ip || '',
    });
  } catch (err) {
    console.error('[ADMIN AUDIT] Failed to write audit entry:', err.message, entry.action, entry.bookingId);
  }
}

// The stable, comparable slice of a booking used for before/after audit values.
export function bookingSnapshot(booking) {
  return {
    status: booking.status ?? null,
    payment_status: booking.payment_status ?? null,
    payout_status: booking.payout_status ?? null,
    price_total: booking.price_total ?? null,
    charge_amount: booking.charge_amount ?? null,
    platform_fee: booking.platform_fee ?? null,
    net_amount: booking.net_amount ?? null,
    tip_amount: booking.tip_amount ?? null,
    scheduled_start: booking.scheduled_start ?? null,
    address: booking.address ?? null,
    admin_resolution: booking.admin_resolution ?? null,
    payout_hold: booking.payout_hold ?? false,
  };
}

export function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// In-app notification. Notifications for other users can only be created with
// the service role, so admin actions always use it.
export async function notifyUser(base44, userId, { type = 'booking', title, body, link }) {
  if (!userId) return;
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      type,
      title,
      body,
      link: link || '',
      read: false,
    });
  } catch (err) {
    console.error('[ADMIN NOTIFY] Failed:', err.message, userId);
  }
}

// Everyone who should hear about a change to a booking: the neighbor, the teen,
// and the parent when there is one. Deduplicated, optional exclusions.
export async function notifyBookingParties(base44, booking, payload, opts = {}) {
  const ids = [
    booking.buyer_user_id,
    booking.teen_user_id,
    booking.parent_user_id,
  ].filter(Boolean);
  const skip = opts.skip || [];
  for (const id of [...new Set(ids)].filter((id) => !skip.includes(id))) {
    await notifyUser(base44, id, {
      ...payload,
      body: `${payload.body}`,
    });
  }
}