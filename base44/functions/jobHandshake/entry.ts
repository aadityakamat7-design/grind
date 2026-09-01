import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeContext, getStripeForApp } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { roleFor, recordStart, recordParentStart, recordTeenFinish, recordBuyerConfirm, recordBuyerDispute, recordBuyerStartAfterPayment } from '../../shared/jobHandshake.ts';

// The single entry point for the photo-proof job completion flow.
//   start   — both teen and buyer confirm start (buyer pays escrow on start)
//   finish  — teen marks the job done and uploads completion photos
//   confirm — buyer confirms the work is done correctly → releases escrow
//   dispute — buyer reports the teen didn't do the job → holds escrow for admin
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, action, completionPhotos, tipAmount, disputeReason } = await req.json();
    if (!bookingId || !['start', 'finish', 'confirm', 'dispute'].includes(action)) {
      return Response.json({ error: 'bookingId and a valid action are required' }, { status: 400 });
    }

    let booking;
    try {
      booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    } catch {
      booking = null;
    }
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const role = roleFor(booking, user.id);
    if (!role) return Response.json({ error: 'Only the people on this job can do that.' }, { status: 403 });

    if (action === 'start') {
      if (booking.status !== 'confirmed') {
        return Response.json({ error: 'This job must be approved by the parent before it can start.' }, { status: 400 });
      }
      if (booking.teen_started_at && booking.parent_started_at) {
        return Response.json({ alreadyDone: true, started: true });
      }

      // Teen start: just record the teen's confirmation. No payment moves here.
      if (role === 'teen') {
        if (booking.teen_started_at) return Response.json({ alreadyDone: true });
        const result = await recordStart(base44, booking);
        return Response.json(result);
      }

      // Parent start: the parent confirms the teen is beginning the work. The
      // job goes in_progress once both the parent and the teen have confirmed.
      if (role === 'parent') {
        if (booking.parent_started_at) return Response.json({ alreadyDone: true });
        const result = await recordParentStart(base44, booking);
        return Response.json(result);
      }

      // Buyer start: the buyer pays the job price now. Funds are held in escrow
      // (platform balance) — the webhook records buyer_started_at + held, and
      // advances to in_progress if the teen has already started.
      if (booking.buyer_started_at) return Response.json({ alreadyDone: true });

      const chargeAmount = booking.charge_amount ?? booking.price_total;
      const cents = Math.round(Number(chargeAmount) * 100);
      if (cents <= 0) {
        // Referral credit covered the whole job — no charge, mark held directly.
        const result = await recordBuyerStartAfterPayment(base44, booking, '');
        return Response.json(result);
      }

      const { stripe, testMode } = await getStripeContext(base44);
      const origin = getSafeOrigin(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.listing_title || 'Blockwork job',
              description: 'Held in escrow until the neighbor confirms the job is complete.',
            },
            unit_amount: cents,
          },
          quantity: 1,
        }],
        success_url: `${origin}/bookings/${booking.id}?started=1`,
        cancel_url: `${origin}/bookings/${booking.id}`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          booking_id: booking.id,
          start_payment: '1',
        },
        payment_intent_data: { metadata: { booking_id: booking.id, start_payment: '1' } },
      });
      await base44.asServiceRole.entities.Booking.update(booking.id, { stripe_session_id: session.id, is_test_mode: testMode });
      return Response.json({ url: session.url });
    }

    // action === 'finish' — teen marks the job done with completion photos
    if (action === 'finish') {
      if (role !== 'teen') return Response.json({ error: 'Only the teen can mark the job finished.' }, { status: 403 });
      if (booking.status !== 'in_progress') {
        return Response.json({ error: 'The job has to be in progress before it can be finished.' }, { status: 400 });
      }
      if (booking.teen_finished_at) return Response.json({ alreadyDone: true });

      const photos = Array.isArray(completionPhotos) ? completionPhotos : [];
      if (photos.length === 0) {
        return Response.json({ error: 'Please upload at least one photo showing the completed work.' }, { status: 400 });
      }
      const result = await recordTeenFinish(base44, booking, photos);
      return Response.json(result);
    }

    // action === 'confirm' — buyer confirms the work is done correctly
    if (action === 'confirm') {
      if (role !== 'buyer') return Response.json({ error: 'Only the neighbor can confirm the job is done.' }, { status: 403 });
      if (booking.status !== 'in_progress' || !booking.teen_finished_at) {
        return Response.json({ error: 'The teen must finish the job before you can confirm it.' }, { status: 400 });
      }
      if (booking.buyer_finished_at || booking.buyer_disputed_at) {
        return Response.json({ alreadyDone: true });
      }

      const tip = Math.max(0, Math.round((Number(tipAmount) || 0) * 100) / 100);

      // A tip is real money — it must clear Stripe before we record the buyer's
      // confirmation. The webhook records the confirmation and releases once
      // the tip payment succeeds.
      if (tip > 0) {
        const stripe = await getStripeForApp(base44);
        const origin = getSafeOrigin(req);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Tip for ${booking.teen_display_name || 'your local teen'}`,
                  description: `Tip for "${booking.listing_title}" — 100% goes to the teen.`,
                },
                unit_amount: Math.round(tip * 100),
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/bookings/${booking.id}?paid=1`,
          cancel_url: `${origin}/bookings/${booking.id}`,
          metadata: {
            base44_app_id: Deno.env.get('BASE44_APP_ID'),
            tip_booking_id: booking.id,
            tip_amount: String(tip),
          },
        });
        return Response.json({ url: session.url });
      }

      const result = await recordBuyerConfirm(base44, booking, 0);
      return Response.json(result);
    }

    // action === 'dispute' — buyer reports the teen didn't do the job
    if (action === 'dispute') {
      if (role !== 'buyer') return Response.json({ error: 'Only the neighbor can report a problem.' }, { status: 403 });
      if (booking.status !== 'in_progress' || !booking.teen_finished_at) {
        return Response.json({ error: 'The teen must finish the job before you can report a problem.' }, { status: 400 });
      }
      if (booking.buyer_finished_at || booking.buyer_disputed_at) {
        return Response.json({ alreadyDone: true });
      }
      const reason = String(disputeReason || '').trim();
      if (!reason) {
        return Response.json({ error: 'Please explain what was wrong with the work.' }, { status: 400 });
      }
      const result = await recordBuyerDispute(base44, booking, reason);
      return Response.json(result);
    }
  } catch (error) {
    console.error('jobHandshake error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});