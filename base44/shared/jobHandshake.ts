import { releaseBookingPayment } from './releaseBooking.ts';

// Two-sided job handshake. A job only STARTS when both the teen and the
// neighbor press "Start job", and only FINISHES (and pays out) when both
// press "Finish job". All state transitions happen here, server-side, so
// neither side can move the job or trigger a payout on their own.

export function roleFor(booking, userId) {
  if (booking.teen_user_id === userId) return 'teen';
  if (booking.buyer_user_id === userId) return 'buyer';
  return null;
}

export function bothStarted(b) {
  return !!b.teen_started_at && !!b.buyer_started_at;
}

export function bothFinished(b) {
  return !!b.teen_finished_at && !!b.buyer_finished_at;
}

// Records one side's "start" and flips the booking to in_progress once both agree.
export async function recordStart(base44, booking, role) {
  const svc = base44.asServiceRole.entities;
  const field = role === 'teen' ? 'teen_started_at' : 'buyer_started_at';
  if (booking[field]) return { alreadyDone: true, started: bothStarted(booking) };

  const patch = { [field]: new Date().toISOString() };
  const next = { ...booking, ...patch };
  const nowStarted = bothStarted(next);
  if (nowStarted) patch.status = 'in_progress';

  await svc.Booking.update(booking.id, patch);

  const otherId = role === 'teen' ? booking.buyer_user_id : booking.teen_user_id;
  const actorName = role === 'teen' ? booking.teen_display_name : booking.buyer_name;

  if (nowStarted) {
    for (const uid of [booking.teen_user_id, booking.buyer_user_id]) {
      await svc.Notification.create({
        user_id: uid,
        type: 'booking',
        title: 'Job started',
        body: `Both sides confirmed — "${booking.listing_title}" is now in progress.`,
        link: `/bookings/${booking.id}`,
      });
    }
    if (booking.parent_user_id) {
      await svc.Notification.create({
        user_id: booking.parent_user_id,
        type: 'booking',
        title: 'Job started',
        body: `"${booking.listing_title}" just started — live location is being shared with you.`,
        link: `/bookings/${booking.id}`,
      });
    }
  } else {
    await svc.Notification.create({
      user_id: otherId,
      type: 'booking',
      title: `${actorName} is ready to start`,
      body: `Press "Start job" on "${booking.listing_title}" to begin.`,
      link: `/bookings/${booking.id}`,
    });
  }

  return { started: nowStarted };
}

// Records one side's "finish". Once both agree the booking completes and the
// escrowed payment is released (85% to the teen's parent, 15% platform fee).
export async function recordFinish(base44, booking, role, tip = 0) {
  const svc = base44.asServiceRole.entities;
  const field = role === 'teen' ? 'teen_finished_at' : 'buyer_finished_at';

  const patch = {};
  if (!booking[field]) patch[field] = new Date().toISOString();
  if (tip > 0) patch.tip_amount = tip;

  const next = { ...booking, ...patch };
  const nowFinished = bothFinished(next);
  if (nowFinished) patch.status = 'completed';

  if (Object.keys(patch).length > 0) {
    await svc.Booking.update(booking.id, patch);
  }

  if (!nowFinished) {
    const otherId = role === 'teen' ? booking.buyer_user_id : booking.teen_user_id;
    const actorName = role === 'teen' ? booking.teen_display_name : booking.buyer_name;
    await svc.Notification.create({
      user_id: otherId,
      type: 'booking',
      title: `${actorName} marked the job finished`,
      body: `Press "Finish job" on "${booking.listing_title}" to confirm and release payment.`,
      link: `/bookings/${booking.id}`,
    });
    return { finished: false, released: false };
  }

  // Both sides agree the job is done — release escrow exactly once.
  const fresh = await svc.Booking.get(booking.id);
  if (fresh.payment_status !== 'held') {
    return { finished: true, released: false };
  }
  const teenGets = await releaseBookingPayment(base44, fresh, Number(fresh.tip_amount) || 0);
  return { finished: true, released: true, teenGets };
}