import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';
import { applyTeenVerifiedIdentity } from '../../shared/teenIdentityVerification.ts';
import { applyBuyerVerifiedIdentity } from '../../shared/buyerIdentityVerification.ts';
import { recordFinish, recordBuyerStartAfterPayment } from '../../shared/jobHandshake.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Live-mode Stripe + the live webhook signing secret (STRIPE_WEBHOOK_SECRET)
    const stripe = getStripe();
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    );

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
        // The buyer's tip cleared Stripe — now record their "finish" and, if the
        // teen has also finished, complete the job and release escrow + tip.
        const booking = await base44.asServiceRole.entities.Booking.get(tipBookingId);
        if (booking && booking.payment_status === 'held') {
          const tip = Number(session.metadata?.tip_amount) || 0;
          const result = await recordFinish(base44, booking, 'buyer', tip);
          console.log(`Booking ${tipBookingId} buyer finish recorded with tip ${tip}:`, JSON.stringify(result));
        }
      }
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        if (session.metadata?.start_payment === '1') {
          // Buyer's start payment cleared — record buyer_started_at + held, and
          // advance to in_progress if the teen has already started.
          const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
          if (booking && !booking.buyer_started_at) {
            await recordBuyerStartAfterPayment(base44, booking, session.payment_intent);
            console.log(`Booking ${bookingId} buyer start recorded (payment ${session.payment_intent})`);
          }
        } else {
          // Legacy escrow payment (pre-start model) — kept for backward compat.
          await base44.asServiceRole.entities.Booking.update(bookingId, {
            payment_status: 'held',
            stripe_payment_intent_id: session.payment_intent,
          });
          console.log(`Booking ${bookingId} marked as held (payment ${session.payment_intent})`);
        }
      }
      const jobPostId = session.metadata?.job_post_id;
      if (jobPostId) {
        await base44.asServiceRole.entities.JobPost.update(jobPostId, {
          payment_status: 'held',
          status: 'open',
          stripe_payment_intent_id: session.payment_intent,
        });
        console.log(`JobPost ${jobPostId} marked as held and published (payment ${session.payment_intent})`);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const bookingId = pi.metadata?.booking_id;
      const jobPostId = pi.metadata?.job_post_id;

      if (bookingId && pi.metadata?.start_payment === '1') {
        const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
        if (booking && !booking.buyer_started_at) {
          await recordBuyerStartAfterPayment(base44, booking, pi.id);
          console.log(`Booking ${bookingId} buyer start recorded (PI ${pi.id})`);
        }
      } else if (bookingId) {
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          payment_status: 'held',
          stripe_payment_intent_id: pi.id,
        });
        console.log(`Booking ${bookingId} marked as held (PI ${pi.id})`);
      }

      if (jobPostId) {
        await base44.asServiceRole.entities.JobPost.update(jobPostId, {
          payment_status: 'held',
          status: 'open',
          stripe_payment_intent_id: pi.id,
        });
        console.log(`JobPost ${jobPostId} marked as held and published (PI ${pi.id})`);
      }
    }

    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const subject = session.metadata?.verification_subject;
      let result;
      if (subject === 'teen') {
        result = await applyTeenVerifiedIdentity(base44, stripe, session.id);
      } else if (subject === 'buyer') {
        result = await applyBuyerVerifiedIdentity(base44, stripe, session.id);
      } else {
        result = await applyVerifiedIdentity(base44, stripe, session.id);
      }
      console.log(`Identity session ${session.id} (${subject || 'parent'}) processed:`, JSON.stringify(result));
    }

    if (event.type === 'identity.verification_session.requires_input') {
      const session = event.data.object;
      const reason = session.last_error?.reason || 'Verification needs to be retried';
      const subject = session.metadata?.verification_subject;
      if (subject === 'teen') {
        const profiles = await base44.asServiceRole.entities.TeenProfile.filter({ identity_session_id: session.id });
        if (profiles[0]) {
          await base44.asServiceRole.entities.TeenProfile.update(profiles[0].id, { identity_status: 'failed' });
        }
      } else if (subject === 'buyer') {
        const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ identity_session_id: session.id });
        if (profiles[0]) {
          await base44.asServiceRole.entities.BuyerProfile.update(profiles[0].id, { id_verification_status: 'failed' });
        }
      } else {
        const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ identity_session_id: session.id });
        if (profiles[0]) {
          await base44.asServiceRole.entities.ParentProfile.update(profiles[0].id, { identity_status: 'failed' });
        }
      }
      console.log(`Identity session ${session.id} (${subject || 'parent'}) requires input: ${reason}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
});