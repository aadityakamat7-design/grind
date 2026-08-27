import { releaseBookingPayment } from './releaseBooking.ts';
import { notifyAdmins } from './notifyAdmins.ts';

// Photo-proof job completion flow:
//   1. Both sides press Start (teen + buyer) → in_progress (unchanged)
//   2. Teen finishes: uploads completion photos → teen_finished_at set, buyer
//      has 12 hours to confirm or dispute.
//   3a. Buyer confirms → buyer_finished_at set, status → completed, escrow
//       released to the parent (auto-pay).
//   3b. Buyer disputes → buyer_disputed_at set, status → disputed, escrow held
//       pending admin review.
//   4. If the buyer doesn't respond within 12 hours, the scheduled checker
//       auto-confirms and releases (flagStaleHandshakes).

export function roleFor(booking, userId) {
  if (booking.teen_user_id === userId) return 'teen';
  if (booking.buyer_user_id === userId) return 'buyer';
  return null;
}

export function bothStarted(b) {
  return !!b.teen_started_at && !!b.buyer_started_at;
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

// Teen marks the job finished and uploads completion photos as proof. This
// starts the 12-hour buyer confirmation window — no money moves yet.
export async function recordTeenFinish(base44, booking, photos) {
  const svc = base44.asServiceRole.entities;
  if (booking.teen_finished_at) return { alreadyDone: true };

  await svc.Booking.update(booking.id, {
    teen_finished_at: new Date().toISOString(),
    completion_photos: Array.isArray(photos) ? photos : [],
  });

  await svc.Notification.create({
    user_id: booking.buyer_user_id,
    type: 'booking',
    title: `${booking.teen_display_name} finished the job`,
    body: `Check the photos and confirm within 12 hours. If the work isn't done correctly, tap "Report a problem" to hold payment for review.`,
    link: `/bookings/${booking.id}`,
  });
  if (booking.parent_user_id) {
    await svc.Notification.create({
      user_id: booking.parent_user_id,
      type: 'booking',
      title: `${booking.teen_display_name} finished the job`,
      body: `"${booking.listing_title}" — waiting for the neighbor to confirm the work is done.`,
      link: `/bookings/${booking.id}`,
    });
  }

  return { finished: true, waitingForBuyer: true };
}

// Buyer confirms the job was done correctly. This completes the booking and
// releases the escrowed payment to the parent (auto-pay). The tip amount
// passed here must already have been charged through Stripe (or be zero).
export async function recordBuyerConfirm(base44, booking, tip = 0) {
  const svc = base44.asServiceRole.entities;
  if (booking.buyer_finished_at) return { alreadyDone: true, released: false };

  const patch = {
    buyer_finished_at: new Date().toISOString(),
    status: 'completed',
  };
  if (tip > 0) patch.tip_amount = tip;
  await svc.Booking.update(booking.id, patch);

  // Release escrow exactly once — atomic lock so a concurrent webhook tip
  // confirmation and a direct confirm can never double-release.
  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await svc.Booking.updateMany(
    { id: booking.id, payment_status: 'held' },
    { $set: { payment_status: 'releasing', stripe_transfer_id: lockToken } },
  );
  const fresh = await svc.Booking.get(booking.id);
  if (fresh.payment_status !== 'releasing' || fresh.stripe_transfer_id !== lockToken) {
    return { confirmed: true, released: false };
  }
  try {
    const teenGets = await releaseBookingPayment(base44, fresh, Number(fresh.tip_amount) || 0);
    return { confirmed: true, released: true, teenGets };
  } catch (err) {
    await svc.Booking.update(booking.id, { payment_status: 'held', stripe_transfer_id: '' });
    throw err;
  }
}

// Buyer reports the teen did not do the job. Holds escrow pending admin review.
export async function recordBuyerDispute(base44, booking, reason) {
  const svc = base44.asServiceRole.entities;
  if (booking.buyer_disputed_at) return { alreadyDone: true };

  await svc.Booking.update(booking.id, {
    buyer_disputed_at: new Date().toISOString(),
    dispute_reason: String(reason || '').slice(0, 500),
    status: 'disputed',
    payout_status: 'pending_review',
    payout_review_reason: 'Neighbor reported the job was not done correctly',
  });

  for (const uid of [booking.teen_user_id, booking.parent_user_id].filter(Boolean)) {
    await svc.Notification.create({
      user_id: uid,
      type: 'booking',
      title: 'Job flagged for review',
      body: `"${booking.listing_title}" — the neighbor reported the work wasn't done correctly. Our team is reviewing it before any payment is released.`,
      link: `/bookings/${booking.id}`,
    });
  }
  await notifyAdmins(base44, {
    type: 'booking',
    title: 'Disputed job needs review',
    body: `"${booking.listing_title}" — the neighbor reported the teen didn't do the job. Payment is held pending your review.`,
    link: '/admin',
  });

  return { disputed: true };
}