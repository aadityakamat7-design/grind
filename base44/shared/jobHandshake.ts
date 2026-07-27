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

// Teen confirms Start. If the buyer has already paid (buyer_started_at set),
// the job goes in_progress immediately. No money moves here — the buyer's
// start payment is handled separately (checkout + webhook).
export async function recordStart(base44, booking) {
  const svc = base44.asServiceRole.entities;
  if (booking.teen_started_at) return { alreadyDone: true, started: bothStarted(booking) };

  const patch = { teen_started_at: new Date().toISOString() };
  const next = { ...booking, ...patch };
  const nowStarted = bothStarted(next);
  if (nowStarted) patch.status = 'in_progress';

  await svc.Booking.update(booking.id, patch);

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
      user_id: booking.buyer_user_id,
      type: 'booking',
      title: `${booking.teen_display_name} is ready to start`,
      body: `Press "Start job" on "${booking.listing_title}" to pay and begin.`,
      link: `/bookings/${booking.id}`,
    });
  }

  return { started: nowStarted };
}

// Called by the webhook once the buyer's start payment clears Stripe. Records
// buyer_started_at, marks payment held, and advances to in_progress if the
// teen has already started.
export async function recordBuyerStartAfterPayment(base44, booking, paymentIntentId) {
  const svc = base44.asServiceRole.entities;
  if (booking.buyer_started_at) return { alreadyDone: true, started: bothStarted(booking) };

  const patch = {
    buyer_started_at: new Date().toISOString(),
    payment_status: 'held',
    stripe_payment_intent_id: paymentIntentId,
  };
  const next = { ...booking, ...patch };
  const nowStarted = bothStarted(next);
  if (nowStarted) patch.status = 'in_progress';

  await svc.Booking.update(booking.id, patch);

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
      user_id: booking.teen_user_id,
      type: 'booking',
      title: `${booking.buyer_name} is ready to start`,
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
  // Atomic guard: flip payment_status from 'held' to 'releasing' using
  // updateMany with a filter so only one concurrent call wins the lock.
  // A unique lock token is stamped on stripe_transfer_id so the winner can
  // confirm it got the lock via a re-read.
  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await svc.Booking.updateMany(
    { id: booking.id, payment_status: 'held' },
    { $set: { payment_status: 'releasing', stripe_transfer_id: lockToken } },
  );
  const fresh = await svc.Booking.get(booking.id);
  if (fresh.payment_status !== 'releasing' || fresh.stripe_transfer_id !== lockToken) {
    // Another call already claimed the release (or it was already released)
    return { finished: true, released: false };
  }
  try {
    const teenGets = await releaseBookingPayment(base44, fresh, Number(fresh.tip_amount) || 0);
    return { finished: true, released: true, teenGets };
  } catch (err) {
    // Roll back the sentinel so a retry can attempt the release again
    await svc.Booking.update(booking.id, { payment_status: 'held', stripe_transfer_id: '' });
    throw err;
  }
}