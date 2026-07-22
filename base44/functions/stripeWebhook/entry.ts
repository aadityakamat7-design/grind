import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';
import { releaseBookingPayment } from '../../shared/releaseBooking.ts';

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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tipBookingId = session.metadata?.tip_booking_id;
      if (tipBookingId) {
        // Paid tip checkout — release the escrowed payment plus the charged tip
        const booking = await base44.asServiceRole.entities.Booking.get(tipBookingId);
        if (booking && booking.payment_status === 'held') {
          const tip = Number(session.metadata?.tip_amount) || 0;
          await releaseBookingPayment(base44, booking, tip);
          console.log(`Booking ${tipBookingId} released with paid tip of ${tip}`);
        }
      }
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await base44.asServiceRole.entities.Booking.update(bookingId, {
          payment_status: 'held',
          stripe_payment_intent_id: session.payment_intent,
        });
        console.log(`Booking ${bookingId} marked as held (payment ${session.payment_intent})`);
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
    return Response.json({ error: error.message }, { status: 400 });
  }
});