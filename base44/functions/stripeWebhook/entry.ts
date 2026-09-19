import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';
import { recordBuyerConfirm, recordBuyerStartAfterPayment } from '../../shared/jobHandshake.ts';
import { alertSecurityEvent } from '../../shared/securityMonitor.ts';
import { notifyOwnerTransaction } from '../../shared/notifyOwnerTransaction.ts';
import { sendBookingEmail } from '../../shared/bookingEmails.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

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

    // Marks an escrow booking as paid/held and notifies the parent that they
    // can now approve. Idempotent — skips if payment is already held so the
    // duplicate payment_intent.succeeded event doesn't double-notify.
    const markEscrowHeld = async (bookingId, paymentIntentId, isTest) => {
      const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!booking || booking.payment_status === 'held') return;
      await base44.asServiceRole.entities.Booking.update(bookingId, {
        payment_status: 'held',
        stripe_payment_intent_id: paymentIntentId,
        is_test_mode: isTest,
      });
      if (booking.parent_user_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: booking.parent_user_id,
          type: 'booking',
          title: 'Payment confirmed — please approve',
          body: `${booking.buyer_name}'s payment for "${booking.listing_title}" is held in escrow. Please review and approve this booking.`,
          link: `/bookings/${bookingId}`,
          read: false,
        });
      }
      await sendBookingEmail(base44, { booking, event: 'payment_confirmed', origin: getSafeOrigin(req), excludeUserId: booking.buyer_user_id });
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tipBookingId = session.metadata?.tip_booking_id;
      if (tipBookingId) {
        // The buyer's tip cleared Stripe — now record their confirmation and
        // release escrow + tip to the parent.
        const booking = await base44.asServiceRole.entities.Booking.get(tipBookingId);
        // The teen must have finished AND the buyer must not have already confirmed.
        // recordBuyerConfirm also checks teen_finished_at internally (defense-in-depth).
        if (booking && booking.payment_status === 'held' && !booking.buyer_finished_at && booking.teen_finished_at) {
          const tip = Number(session.metadata?.tip_amount) || 0;
          const result = await recordBuyerConfirm(base44, booking, tip, session.payment_intent || '');
        }
        await notifyOwnerTransaction(base44, {
          type: 'Tip charge',
          title: `"${booking?.listing_title || tipBookingId}" — $${(Number(session.metadata?.tip_amount) || 0).toFixed(2)}`,
          details: `Booking: ${tipBookingId}\nPayment intent: ${session.payment_intent || 'n/a'}\nMode: ${isTestEvent ? 'TEST' : 'LIVE'}`,
        });
      }
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await notifyOwnerTransaction(base44, {
          type: 'Escrow charge',
          title: `"${bookingId}" — ${session.metadata?.start_payment === '1' ? 'start payment' : 'escrow hold'}`,
          details: `Booking: ${bookingId}\nPayment intent: ${session.payment_intent || 'n/a'}\nMode: ${isTestEvent ? 'TEST' : 'LIVE'}`,
        });
        if (session.metadata?.start_payment === '1') {
          // Buyer's start payment cleared — record buyer_started_at + held, and
          // advance to in_progress if the teen has already started.
          const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
          if (booking && !booking.buyer_started_at) {
            await recordBuyerStartAfterPayment(base44, booking, session.payment_intent, { isTestMode: isTestEvent });
          }
        } else {
          // Escrow payment cleared — mark as held and notify the parent.
          await markEscrowHeld(bookingId, session.payment_intent, isTestEvent);
        }
      }

      // Upfront job-post payment cleared — flip the post from draft to open and
      // start the 7-day no-taker window. Escrow is held until a teen completes.
      const jobPostId = session.metadata?.job_post_id;
      if (jobPostId) {
        const job = await base44.asServiceRole.entities.JobPost.get(jobPostId);
        if (job && job.status === 'draft' && job.payment_status === 'unpaid') {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await base44.asServiceRole.entities.JobPost.update(job.id, {
            status: 'open',
            payment_status: 'held',
            stripe_payment_intent_id: session.payment_intent,
            expires_at: expiresAt,
            is_test_mode: isTestEvent,
          });
        }
        await notifyOwnerTransaction(base44, {
          type: 'Job post escrow',
          title: `"${job?.title || jobPostId}" — upfront posting payment`,
          details: `Job: ${jobPostId}\nPayment intent: ${session.payment_intent || 'n/a'}\nMode: ${isTestEvent ? 'TEST' : 'LIVE'}`,
        });
      }

    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const bookingId = pi.metadata?.booking_id;

      if (bookingId && pi.metadata?.start_payment === '1') {
        const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
        if (booking && !booking.buyer_started_at) {
          await recordBuyerStartAfterPayment(base44, booking, pi.id, { isTestMode: isTestEvent });
        }
      } else if (bookingId) {
        // Escrow payment cleared — mark as held and notify the parent.
        await markEscrowHeld(bookingId, pi.id, isTestEvent);
      }

      if (pi.metadata?.job_post_id) {
        const job = await base44.asServiceRole.entities.JobPost.get(pi.metadata.job_post_id);
        if (job && job.status === 'draft' && job.payment_status === 'unpaid') {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await base44.asServiceRole.entities.JobPost.update(job.id, {
            status: 'open',
            payment_status: 'held',
            stripe_payment_intent_id: pi.id,
            expires_at: expiresAt,
            is_test_mode: isTestEvent,
          });
        }
      }


    }

    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const result = await applyVerifiedIdentity(base44, stripe, session.id);
    }

    if (event.type === 'identity.verification_session.requires_input') {
      const session = event.data.object;
      const reason = session.last_error?.reason || 'Verification needs to be retried';
      const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ identity_session_id: session.id });
      if (profiles[0]) {
        await base44.asServiceRole.entities.ParentProfile.update(profiles[0].id, { identity_status: 'failed' });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
});