import { getStripeForApp } from './stripeEnv.ts';
import { notifyAdmins } from './notifyAdmins.ts';
import { notifyParentPayoutSent } from './notifyParent.ts';

const REVIEW_THRESHOLD = 100; // USD — payouts at/above this go to manual review
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Attempts the Stripe Connect transfer of a released booking's net payout
// (net_amount + tip) to the destination Connect account. For minors the
// destination is the parent's Connect account; for independent 18+ teens
// (no parent on the booking) it is the teen's own Connect account. Depending
// on state it lands in: awaiting_bank, pending_review, or transferred.
export async function attemptBookingPayout(base44, booking, { skipReview = false } = {}) {
  const svc = base44.asServiceRole.entities;
  const amount = Math.round(((booking.net_amount || 0) + (booking.tip_amount || 0)) * 100) / 100;
  if (amount <= 0) return { status: 'not_started' };

  // Payouts route to the parent's Connect account for minors, or the teen's
  // own Connect account for independent 18+ teens (no parent on the booking).
  const isIndependent = !booking.parent_user_id;
  const destUserId = isIndependent ? booking.teen_user_id : booking.parent_user_id;
  const returnLink = isIndependent ? '/teen' : '/parent/payouts';
  const profiles = isIndependent
    ? await svc.TeenProfile.filter({ user_id: booking.teen_user_id })
    : await svc.ParentProfile.filter({ user_id: booking.parent_user_id });
  const dest = profiles[0];

  if (!dest?.stripe_connect_account_id || dest.connect_status !== 'active') {
    await svc.Booking.update(booking.id, { payout_status: 'awaiting_bank' });
    await svc.Notification.create({
      user_id: destUserId,
      type: 'payment',
      title: 'Connect a bank to receive this payout',
      body: `${money(amount)} from "${booking.listing_title}" is waiting. Connect your bank in Payouts to receive it.`,
      link: returnLink,
    });
    return { status: 'awaiting_bank' };
  }

  if (!skipReview) {
    // Only large payouts get held for manual review. Small transactions transfer
    // automatically — whatever nets out after Stripe fees goes straight through.
    if (amount >= REVIEW_THRESHOLD) {
      const reason = `Amount of ${money(amount)} is over ${money(REVIEW_THRESHOLD)}`;
      await svc.Booking.update(booking.id, { payout_status: 'pending_review', payout_review_reason: reason });
      await svc.Notification.create({
        user_id: destUserId,
        type: 'payment',
        title: 'Payout in a short safety review',
        body: `Your ${money(amount)} payout for "${booking.listing_title}" is in a brief review (${reason.toLowerCase()}). It's usually released within 1 business day.`,
        link: returnLink,
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

  const stripe = await getStripeForApp(base44);
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
      destination: dest.stripe_connect_account_id,
      ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        booking_id: booking.id,
        parent_user_id: booking.parent_user_id || '',
        teen_user_id: booking.teen_user_id || '',
      },
    }, {
      // Idempotency key tied to the booking — a retried webhook or concurrent
      // processPayout call can never create a duplicate transfer for the
      // same booking.
      idempotencyKey: `payout_${booking.id}`,
    });
    await svc.Booking.update(booking.id, {
      payout_status: 'transferred',
      stripe_transfer_id: transfer.id,
      transferred_at: new Date().toISOString(),
      payout_review_reason: '',
    });
    await svc.Notification.create({
      user_id: destUserId,
      type: 'payment',
      title: 'Payout on its way to your bank 🏦',
      body: `${money(amount)} from "${booking.listing_title}" was transferred to your bank ending in ${dest.bank_last4 || '••••'}. It typically arrives in 1–2 business days.`,
      link: returnLink,
    });
    // Email the parent only when there is one (minors). Independent teens get
    // the in-app notification above.
    if (booking.parent_user_id) {
      await notifyParentPayoutSent(base44, {
        parentUserId: booking.parent_user_id,
        amount,
        jobTitle: booking.listing_title,
        bankLast4: dest.bank_last4,
        origin: Deno.env.get('BASE44_APP_URL') || '',
      });
    }
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