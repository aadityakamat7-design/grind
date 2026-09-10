import { getStripeForApp } from './stripeEnv.ts';

// Refunds the Stripe charge for a booking. Works whether the payment is still
// held in escrow or has already been released to the teen's wallet. When the
// payment was already released, the refund pulls from the platform balance and
// the teen's wallet credit is reversed. Uses the app's current test/live mode.
export async function refundHeldPayment(base44, booking) {
  if (!booking.stripe_payment_intent_id) return false;
  if (!['held', 'released', 'releasing'].includes(booking.payment_status)) return false;

  const stripe = await getStripeForApp(base44);
  await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });

  // If the payment was already released to the teen's wallet, reverse the credit.
  if (booking.payment_status === 'released' && Number(booking.net_amount) > 0) {
    const svc = base44.asServiceRole.entities;
    const teenGets = Number(booking.net_amount);
    const wallets = await svc.WalletAccount.filter({ teen_user_id: booking.teen_user_id });
    if (wallets[0]) {
      await svc.WalletAccount.update(wallets[0].id, {
        balance: Math.round(((wallets[0].balance || 0) - teenGets) * 100) / 100,
      });
    }
    await svc.WalletTransaction.create({
      teen_user_id: booking.teen_user_id,
      type: 'cashout',
      amount: -teenGets,
      description: `Refund reversed: "${booking.listing_title}" — neighbor disputed the work`,
      occurred_at: new Date().toISOString(),
    });
  }

  return true;
}