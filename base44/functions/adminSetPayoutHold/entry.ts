import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyUser,
} from '../../shared/adminAction.ts';

// Freezes or unfreezes a booking's payout while support investigates. The
// payout pass skips held bookings, so this genuinely stops the transfer rather
// than just labelling it.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const hold = body?.hold === true;
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    if (hold && ['transferred', 'paid_out'].includes(booking.payout_status)) {
      return Response.json(
        { error: 'This payout has already been transferred to the bank, so it can no longer be held.' },
        { status: 400 },
      );
    }
    if (hold && booking.payout_hold) {
      return Response.json({ error: 'This payout is already on hold.' }, { status: 400 });
    }
    if (!hold && !booking.payout_hold) {
      return Response.json({ error: 'This payout is not on hold.' }, { status: 400 });
    }

    const before = bookingSnapshot(booking);
    const patch = hold
      ? {
        payout_hold: true,
        payout_hold_reason: reason.reasonCode + (reason.reasonNote ? ` — ${reason.reasonNote}` : ''),
        payout_held_at: new Date().toISOString(),
        admin_action_at: new Date().toISOString(),
      }
      : {
        payout_hold: false,
        payout_hold_reason: '',
        payout_held_at: null,
        admin_action_at: new Date().toISOString(),
      };
    await svc.Booking.update(booking.id, patch);

    // The parent is the payout holder, so they (and the teen) are told why the
    // money is paused. Only the teen/parent side is affected by a payout hold.
    const payoutUserIds = [...new Set([booking.parent_user_id, booking.teen_user_id].filter(Boolean))];
    for (const uid of payoutUserIds) {
      await notifyUser(base44, uid, {
        type: 'payment',
        title: hold ? 'Payment under review' : 'Payment review finished',
        body: hold
          ? `"${booking.listing_title}" — Blockwork support is reviewing this payment, so the payout is paused for now. We'll be in touch.`
          : `"${booking.listing_title}" — the review is finished and the normal payout flow has resumed.`,
        link: booking.parent_user_id === uid ? '/parent/payouts' : '/teen/wallet',
      });
    }

    await writeAdminAudit(base44, {
      admin: user,
      action: hold ? 'hold_payout' : 'release_payout_hold',
      actionGroup: 'payment',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.parent_user_id || booking.teen_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: bookingSnapshot({ ...booking, ...patch }),
      summary: `${hold ? 'Froze' : 'Released the hold on'} the payout for "${booking.listing_title}".`,
      ip,
    });

    return Response.json({ success: true, payout_hold: hold });
  } catch (error) {
    console.error('adminSetPayoutHold error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});