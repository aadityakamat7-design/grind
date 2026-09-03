import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';
import { recordBuyerConfirm, recordBuyerStartAfterPayment } from '../../shared/jobHandshake.ts';
import { alertSecurityEvent } from '../../shared/securityMonitor.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    // Verify with the live signing secret first; if that fails, retry with the
    // test signing secret so test-mode events (signed with STRIPE_TEST_WEBHOOK_SECRET)
    // are accepted regardless of the admin toggle state.
    const liveSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const testSecret = Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET');
    let event;
    let isTestEvent = false;
    try {
      event = await getStripe(false).webhooks.constructEventAsync(body, signature, liveSecret);
    } catch (liveErr) {
      if (!testSecret) {
        // Signature verification failed with the live secret and no test
        // secret is configured — this is either a forged request or a
        // misconfigured webhook endpoint. Alert admins immediately.
        await alertSecurityEvent(base44, {
          type: 'safety',
          title: '🚨 Stripe webhook signature verification failed',
          body: `A webhook request failed signature verification. This could be a forged request or a misconfigured endpoint. Error: ${liveErr.message}. IP: ${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}.`,
        });
        throw liveErr;
      }
      try {
        event = await getStripe(true).webhooks.constructEventAsync(body, signature, testSecret);
        isTestEvent = true;
      } catch (testErr) {
        // Both live and test signature verification failed — forged request.
        await alertSecurityEvent(base44, {
          type: 'safety',
          title: '🚨 Stripe webhook signature verification failed (live + test)',
          body: `A webhook request failed signature verification against both live and test secrets. This is likely a forged request. Live error: ${liveErr.message}. Test error: ${testErr.message}. IP: ${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}.`,
        });
        throw testErr;
      }
    }
    const stripe = isTestEvent ? getStripe(true) : getStripe(false);

    // Dedupe by event id — Stripe retries webhooks, so a retried event must
    // never double-process a booking or create a duplicate transfer.
    const existing = await base44.asServiceRole.entities.WebhookEvent.filter({ event_id: event.id });
    if (existing.length > 0) {
      return Response.json({ received: true, duplicate: true });
    }
    await base44.asServiceRole.entities.WebhookEvent.create({ event_id: event.id, event_type: event.type });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tipBookingId = session.metadata?.tip_booking_id;
      if (tipBookingId) {
        // The buyer's tip cleared Stripe — now record their confirmation and
        // release escrow + tip to the parent.
        const booking = await base44.asServiceRole.entities.Booking.get(tipBookingId);
        if (booking && booking.payment_status === 'held' && !booking.buyer_finished_at) {
          const tip = Number(session.metadata?.tip_amount) || 0;
          const result = await recordBuyerConfirm(base44, booking, tip, session.payment_intent || '');
          console.log(`Booking ${tipBookingId} buyer confirm recorded with tip ${tip}:`, JSON.stringify(result));
        }
      }
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        if (session.metadata?.start_payment === '1') {
          // Buyer's start payment cleared — record buyer_started_at + held, and
          // advance to in_progress if the teen has already started.
          const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
          if (booking && !booking.buyer_started_at) {
            await recordBuyerStartAfterPayment(base44, booking, session.payment_intent, { isTestMode: isTestEvent });
            console.log(`Booking ${bookingId} buyer start recorded (payment ${session.payment_intent})`);
          }
        } else {
          // Legacy escrow payment (pre-start model) — kept for backward compat.
          await base44.asServiceRole.entities.Booking.update(bookingId, {
            payment_status: 'held',
            stripe_payment_intent_id: session.payment_intent,
            is_test_mode: isTestEvent,
          });
          console.log(`Booking ${bookingId} marked as held (payment ${session.payment_intent})`);
        }
      }

    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const bookingId = pi.metadata?.booking_id;

      if (bookingId && pi.metadata?.start_payment === '1') {
        const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
        if (booking && !booking.buyer_started_at) {
          await recordBuyerStartAfterPayment(base44, booking, pi.id, { isTestMode: isTestEvent });
          console.log(`Booking ${bookingId} buyer start recorded (PI ${pi.id})`);
        }
      } else if (bookingId) {
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          payment_status: 'held',
          stripe_payment_intent_id: pi.id,
          is_test_mode: isTestEvent,
        });
        console.log(`Booking ${bookingId} marked as held (PI ${pi.id})`);
      }


    }

    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const result = await applyVerifiedIdentity(base44, stripe, session.id);
      console.log(`Identity session ${session.id} processed:`, JSON.stringify(result));
    }

    if (event.type === 'identity.verification_session.requires_input') {
      const session = event.data.object;
      const reason = session.last_error?.reason || 'Verification needs to be retried';
      const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ identity_session_id: session.id });
      if (profiles[0]) {
        await base44.asServiceRole.entities.ParentProfile.update(profiles[0].id, { identity_status: 'failed' });
      }
      console.log(`Identity session ${session.id} requires input: ${reason}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
});