import { releaseBookingPayment } from './releaseBooking.ts';
import { notifyAdmins } from './notifyAdmins.ts';

// Photo-proof job completion flow (mutual handshake):
//   1. Both sides press Start (teen + buyer) → in_progress (unchanged)
//   2. Teen finishes: uploads completion photos → teen_finished_at set, status
//      stays in_progress. Payment is NOT released yet.
//   3. Buyer confirms the work is done → buyer_finished_at set, status → completed,
//      escrow released to the parent/teen. This is the ONLY path that releases payment.
//   4. If the buyer doesn't confirm or dispute within 72 hours, the booking is
//      flagged for admin/dispute review (flagStaleHandshakes) — no auto-release.
//   5. Buyer can dispute instead of confirming → status → disputed, admin reviews.

export function roleFor(booking, userId) {
  if (booking.teen_user_id === userId) return 'teen';
  if (booking.buyer_user_id === userId) return 'buyer';
  if (booking.parent_user_id === userId) return 'parent';
  return null;
}

export function bothStarted(b) {
  // The gating pair for Start is the teen + buyer (the buyer pays the escrow).
  // The parent observes but does not confirm start.
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
        body: `"${booking.listing_title}" just started.`,
        link: `/bookings/${booking.id}`,
      });
    }
  } else {
    await svc.Notification.create({
      user_id: booking.buyer_user_id,
      type: 'booking',
      title: `${booking.teen_display_name} is ready to start`,
      body: `Press "Start job" on "${booking.listing_title}" to pay and hold the escrow.`,
      link: `/bookings/${booking.id}`,
    });
    if (booking.parent_user_id) {
      await svc.Notification.create({
        user_id: booking.parent_user_id,
        type: 'booking',
        title: `${booking.teen_display_name} is ready to start`,
        body: `Waiting for the neighbor to pay the escrow on "${booking.listing_title}" to begin.`,
        link: `/bookings/${booking.id}`,
      });
    }
  }

  return { started: nowStarted };
}

// Called by the webhook once the buyer's start payment clears Stripe. Records
// buyer_started_at, marks payment held, and advances to in_progress if the
// teen has already started.
export async function recordBuyerStartAfterPayment(base44, booking, paymentIntentId, opts = {}) {
  const svc = base44.asServiceRole.entities;
  if (booking.buyer_started_at) return { alreadyDone: true, started: bothStarted(booking) };

  const patch = {
    buyer_started_at: new Date().toISOString(),
    payment_status: 'held',
    stripe_payment_intent_id: paymentIntentId,
    ...(opts.isTestMode !== undefined ? { is_test_mode: opts.isTestMode } : {}),
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
        body: `"${booking.listing_title}" just started.`,
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
// records the teen's finish only — it does NOT release payment and does NOT
// set buyer_finished_at. The buyer must separately confirm the work is done
// (recordBuyerConfirm) before escrow is released. If the buyer doesn't respond
// within 72 hours, flagStaleHandshakes flags the booking for admin review.
export async function recordTeenFinish(base44, booking, photos, opts = {}) {
  const svc = base44.asServiceRole.entities;
  if (booking.teen_finished_at) return { alreadyDone: true };

  // Record only the teen's finish + photos. Status stays in_progress —
  // the booking is only completed when the buyer confirms.
  const patch = {
    teen_finished_at: new Date().toISOString(),
    completion_photos: Array.isArray(photos) ? photos : [],
  };
  // Online tutoring sessions also record the actual duration and an optional note.
  if (opts.sessionDurationMinutes) patch.session_duration_minutes = opts.sessionDurationMinutes;
  if (opts.sessionNote) patch.session_note = opts.sessionNote;
  await svc.Booking.update(booking.id, patch);

  // Notify the buyer to confirm the work. No payment moves here.
  await svc.Notification.create({
    user_id: booking.buyer_user_id,
    type: 'booking',
    title: `${booking.teen_display_name} finished the job`,
    body: `Tap "Confirm done" to release payment, or "Report a problem" if the work isn't right. If you don't respond within 72 hours, the booking will be flagged for review.`,
    link: `/bookings/${booking.id}`,
  });
  if (booking.parent_user_id) {
    await svc.Notification.create({
      user_id: booking.parent_user_id,
      type: 'booking',
      title: `${booking.teen_display_name} finished the job`,
      body: `"${booking.listing_title}" — waiting for the neighbor to confirm the work is done before payment is released.`,
      link: `/bookings/${booking.id}`,
    });
  }

  return { finished: true, released: false };
}

// Buyer confirms the job was done correctly. Sets ONLY buyer_finished_at and
// status → completed. Does NOT release payment directly — that happens in
// releaseIfBothFinished, the single function that checks both timestamps exist.
// The tip amount passed here must already have been charged through Stripe
// (or be zero).
export async function recordBuyerConfirm(base44, booking, tip = 0, tipPaymentIntentId = '') {
  const svc = base44.asServiceRole.entities;
  if (booking.buyer_finished_at) return { alreadyDone: true, released: false };
  // Defense-in-depth: the teen must have finished before the buyer can confirm.
  if (!booking.teen_finished_at) {
    return { error: 'The teen must finish the job before you can confirm it.', released: false };
  }

  const patch = {
    buyer_finished_at: new Date().toISOString(),
    status: 'completed',
  };
  if (tip > 0) patch.tip_amount = tip;
  if (tipPaymentIntentId) patch.tip_stripe_payment_intent_id = tipPaymentIntentId;
  await svc.Booking.update(booking.id, patch);

  // Release payment through the single function that checks BOTH timestamps.
  return await releaseIfBothFinished(base44, booking.id);
}

// THE SINGLE FUNCTION that releases payment. Checks that both teen_finished_at
// AND buyer_finished_at exist before releasing — never called from either
// party's action alone. Uses an atomic lock to prevent double-release from
// concurrent webhook tip confirmations.
export async function releaseIfBothFinished(base44, bookingId) {
  const svc = base44.asServiceRole.entities;
  const fresh = await svc.Booking.get(bookingId);

  // Both timestamps must exist — this is the mutual completion gate.
  if (!fresh.teen_finished_at || !fresh.buyer_finished_at) {
    return { confirmed: true, released: false };
  }

  // Atomic lock so a concurrent webhook tip confirmation and a direct confirm
  // can never double-release.
  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await svc.Booking.updateMany(
    { id: bookingId, payment_status: 'held' },
    { $set: { payment_status: 'releasing', stripe_transfer_id: lockToken } },
  );
  const locked = await svc.Booking.get(bookingId);
  if (locked.payment_status !== 'releasing' || locked.stripe_transfer_id !== lockToken) {
    return { confirmed: true, released: false };
  }
  try {
    const teenGets = await releaseBookingPayment(base44, locked, Number(locked.tip_amount) || 0);
    return { confirmed: true, released: true, teenGets };
  } catch (err) {
    await svc.Booking.update(bookingId, { payment_status: 'held', stripe_transfer_id: '' });
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