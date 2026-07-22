import { getStripe } from './stripeEnv.ts';
import { notifyAdmins } from './notifyAdmins.ts';

const REVIEW_THRESHOLD = 100; // USD — payouts at/above this go to manual review
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Attempts the Stripe Connect transfer of a released booking's net payout
// (net_amount + tip) to the parent's Connect account. Depending on state it
// lands in: awaiting_bank, pending_review, or transferred.
export async function attemptBookingPayout(base44, booking, { skipReview = false } = {}) {
  const svc = base44.asServiceRole.entities;
  const amount = Math.round(((booking.net_amount || 0) + (booking.tip_amount || 0)) * 100) / 100;
  if (amount <= 0) return { status: 'not_started' };

  // Payouts only ever go to the parent's Connect account — never the teen's.
  const profiles = booking.parent_user_id
    ? await svc.ParentProfile.filter({ user_id: booking.parent_user_id })
    : [];
  const parent = profiles[0];

  if (!parent?.stripe_connect_account_id || parent.connect_status !== 'active') {
    await svc.Booking.update(booking.id, { payout_status: 'awaiting_bank' });
    if (booking.parent_user_id) {
      await svc.Notification.create({
        user_id: booking.parent_user_id,
        type: 'payment',
        title: 'Connect a bank to receive this payout',
        body: `${money(amount)} from "${booking.listing_title}" is waiting. Connect your bank in Payouts to receive it.`,
        link: '/parent/payouts',
      });
    }
    return { status: 'awaiting_bank' };
  }

  if (!skipReview) {
    const prior = await svc.Booking.filter(
      { parent_user_id: booking.parent_user_id, payout_status: 'transferred' },
      '-updated_date',
      1,
    );
    const firstTime = prior.length === 0;
    if (firstTime || amount >= REVIEW_THRESHOLD) {
      const reason = firstTime ? 'First payout for this account' : `Amount of ${money(amount)} is over ${money(REVIEW_THRESHOLD)}`;
      await svc.Booking.update(booking.id, { payout_status: 'pending_review', payout_review_reason: reason });
      await svc.Notification.create({
        user_id: booking.parent_user_id,
        type: 'payment',
        title: 'Payout in a short safety review',
        body: `Your ${money(amount)} payout for "${booking.listing_title}" is in a brief review (${reason.toLowerCase()}). It's usually released within 1 business day.`,
        link: '/parent/payouts',
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Payout needs manual review',
        body: `${money(amount)} payout for "${booking.listing_title}" is pending review (${reason.toLowerCase()}).`,
        link: '/admin',
      });
      return { status: 'pending_review', reason };
    }
  }

  const stripe = getStripe();
  try {
    // Tie the transfer to the original charge when possible so it doesn't
    // depend on settled platform balance. The platform fee simply stays behind.
    let sourceTransaction;
    const chargeAmount = booking.charge_amount ?? booking.price_total;
    if (booking.stripe_payment_intent_id && amount <= Number(chargeAmount || 0)) {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      sourceTransaction = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    }
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: parent.stripe_connect_account_id,
      ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        booking_id: booking.id,
        parent_user_id: booking.parent_user_id,
      },
    });
    await svc.Booking.update(booking.id, {
      payout_status: 'transferred',
      stripe_transfer_id: transfer.id,
      transferred_at: new Date().toISOString(),
      payout_review_reason: '',
    });
    await svc.Notification.create({
      user_id: booking.parent_user_id,
      type: 'payment',
      title: 'Payout on its way to your bank 🏦',
      body: `${money(amount)} from "${booking.listing_title}" was transferred to your bank ending in ${parent.bank_last4 || '••••'}. It typically arrives in 1–2 business days.`,
      link: '/parent/payouts',
    });
    return { status: 'transferred', transferId: transfer.id };
  } catch (err) {
    console.error('Stripe transfer failed:', err.message);
    await svc.Booking.update(booking.id, {
      payout_status: 'pending_review',
      payout_review_reason: `Automatic transfer failed: ${err.message}`,
    });
    return { status: 'pending_review', reason: err.message };
  }
}