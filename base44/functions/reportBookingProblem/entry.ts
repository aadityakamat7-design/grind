import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Flags a booking for admin review when a participant reports a problem
// ("job not completed as agreed", dispute, etc.).
//
// Schema choice: this function uses the existing `dispute_flagged_at`
// timestamp field + `payout_status: 'pending_review'` to flag the booking,
// rather than adding a new `disputed` value to the Booking.status enum.
//
// The refund/payment outcome for a disputed booking (full refund, partial
// refund, or release to teen) is decided by an admin during manual review.
// This function does NOT move any money — it only flags the booking and
// notifies participants. No refund amounts, cancellation windows, or
// dispute timelines are hardcoded here.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, reason, details } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const isParticipant = [booking.buyer_user_id, booking.teen_user_id, booking.parent_user_id].includes(user.id);
    if (!isParticipant) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!['confirmed', 'in_progress', 'completed'].includes(booking.status)) {
      return Response.json({ error: "This booking can't be reported at its current stage." }, { status: 400 });
    }

    // Don't double-flag — if already under review, let the caller know.
    if (booking.dispute_flagged_at) {
      return Response.json({ alreadyFlagged: true });
    }

    const actorName = user.full_name?.split(' ')[0] || 'A participant';
    const reasonText = reason || 'job not completed as agreed';
    const detailText = details ? ` — ${details}` : '';

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      dispute_flagged_at: new Date().toISOString(),
      payout_status: 'pending_review',
      payout_review_reason: `Reported by ${actorName}: ${reasonText}${detailText}`,
    });

    // Notify all other participants that the booking is under review.
    const otherIds = [booking.buyer_user_id, booking.teen_user_id, booking.parent_user_id]
      .filter((id) => id && id !== user.id);
    for (const otherId of otherIds) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: otherId,
        type: 'safety',
        title: 'Booking flagged for review',
        body: `${actorName} reported a problem with "${booking.listing_title}". Our team is reviewing it.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }

    return Response.json({ success: true, disputed: true });
  } catch (error) {
    console.error('reportBookingProblem error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});