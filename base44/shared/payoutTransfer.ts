import { getStripeForApp } from './stripeEnv.ts';
import { notifyAdmins } from './notifyAdmins.ts';
import { notifyParentPayoutSent } from './notifyParent.ts';
import { reviewBookingPayout, saveReview } from './payoutReview.ts';
import { notifyOwnerTransaction } from './notifyOwnerTransaction.ts';
import { calculateTipNet } from './platformFee.ts';

const REVIEW_THRESHOLD = 100; // USD — payouts at/above this go to manual review
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Retrieves the charge id and the actual net (after Stripe processing fees)
// for a given PaymentIntent. Returns availableNet = 0 if the charge can't be read.
async function getChargeNet(stripe, paymentIntentId) {
  if (!paymentIntentId) return { sourceTransaction: null, availableNet: 0 };
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const sourceTransaction = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    if (!sourceTransaction) return { sourceTransaction: null, availableNet: 0 };
    const charge = await stripe.charges.retrieve(sourceTransaction, { expand: ['balance_transaction'] });
    const bt = charge.balance_transaction;
    const availableNet = bt && typeof bt.net === 'number' ? Math.max(0, bt.net / 100) : 0;
    return { sourceTransaction, availableNet };
  } catch (e) {
    console.error('Could not read charge for PI', paymentIntentId, ':', e.message);
    return { sourceTransaction: null, availableNet: 0 };
  }
}

// Creates a single Stripe Connect transfer tied to a specific charge (if
// available) so it doesn't depend on settled platform balance. The amount is
// capped to the charge's actual net after Stripe fees. Uses an idempotency
// key tied to the booking + purpose so a retried webhook or concurrent call
// can never create a duplicate transfer.
async function createTransfer(stripe, { amount, sourceTransaction, destination, bookingId, purpose }) {
  if (amount <= 0) return null;
  const transferAmount = sourceTransaction ? Math.min(amount, sourceTransaction.availableNet) : amount;
  if (transferAmount <= 0) return null;
  const transfer = await stripe.transfers.create({
    amount: Math.round(transferAmount * 100),
    currency: 'usd',
    destination,
    ...(sourceTransaction?.sourceTransaction ? { source_transaction: sourceTransaction.sourceTransaction } : {}),
    metadata: {
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      booking_id: bookingId,
      purpose,
    },
  }, { idempotencyKey: `payout_${bookingId}_${purpose}` });
  return { id: transfer.id, amount: transferAmount };
}

// Attempts the Stripe Connect transfer of a released booking's net payout
// (net_amount + tip) to the destination Connect account. For minors the
// destination is the parent's Connect account; for independent 18+ teens
// (no parent on the booking) it is the teen's own Connect account.
//
// The base payout and tip are transferred separately, each tied to its own
// charge, so tip funds are never left stranded in the platform balance.
export async function attemptBookingPayout(base44, booking, { skipReview = false } = {}) {
  const svc = base44.asServiceRole.entities;
  const baseAmount = Math.round((Number(booking.net_amount) || 0) * 100) / 100;
  // The tip transfer is the NET tip after the 3.5% + $0.50 processing fee —
  // the fee stays in the platform balance to cover Stripe's charge cost.
  const tipAmount = calculateTipNet(Math.round((Number(booking.tip_amount) || 0) * 100) / 100);
  const totalAmount = Math.round((baseAmount + tipAmount) * 100) / 100;
  if (totalAmount <= 0) return { status: 'not_started' };

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
      body: `${money(totalAmount)} from "${booking.listing_title}" is waiting. Connect your bank in Payouts to receive it.`,
      link: returnLink,
    });
    return { status: 'awaiting_bank' };
  }

  // Run the automated review agent before any transfer. The agent runs 8
  // fraud/error/compliance checks and produces a risk assessment. Critical
  // failures block the payout entirely and alert admins; medium/high risk
  // holds for admin approval. skipReview is set only when an admin has
  // already approved a held payout — their decision overrides the agent.
  if (!skipReview) {
    const review = await reviewBookingPayout(base44, booking);
    if (review.is_critical || review.recommended_action === 'reject') {
      await saveReview(base44, booking, review, { status: 'blocked' });
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: `BLOCKED: ${review.flags.join('; ')}`,
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: '🚨 Critical payout failure blocked',
        body: `${money(review.amount)} payout for "${booking.listing_title}" was BLOCKED: ${review.flags.join('; ')}.`,
        link: '/admin',
      });
      return { status: 'blocked', reason: review.flags.join('; ') };
    }
    if (review.recommended_action === 'hold_for_admin') {
      await saveReview(base44, booking, review, { status: 'pending' });
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: review.flags.join('; ') || 'Held for admin review',
      });
      await svc.Notification.create({
        user_id: destUserId,
        type: 'payment',
        title: 'Payout in safety review',
        body: `Your ${money(review.amount)} payout for "${booking.listing_title}" is in a brief safety review. It's usually released within 1 business day.`,
        link: returnLink,
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Payout held for review',
        body: `${money(review.amount)} payout for "${booking.listing_title}" held: ${review.flags.join('; ') || 'manual review trigger'}.`,
        link: '/admin',
      });
      return { status: 'pending_review', reason: review.flags.join('; ') };
    }
    // Auto-approved — record the clearance and proceed to the transfer
    await saveReview(base44, booking, review, { status: 'auto_approved' });
  }

  const stripe = await getStripeForApp(base44);

  // Look up the actual net (after Stripe fees) for both the start-payment
  // charge and the tip charge so each transfer is capped to what's actually
  // available and tied to its own source_transaction.
  const baseCharge = await getChargeNet(stripe, booking.stripe_payment_intent_id);
  const tipCharge = await getChargeNet(stripe, booking.tip_stripe_payment_intent_id);

  const transferIds = [];
  let totalTransferred = 0;

  // --- Base transfer (85% net after platform fee) ---
  if (baseAmount > 0) {
    try {
      const result = await createTransfer(stripe, {
        amount: baseAmount,
        sourceTransaction: baseCharge,
        destination: dest.stripe_connect_account_id,
        bookingId: booking.id,
        purpose: 'base',
      });
      if (result) {
        transferIds.push(result.id);
        totalTransferred += result.amount;
      }
    } catch (err) {
      console.error('Base transfer failed:', err.message);
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: `Base transfer failed: ${err.message}`,
      });
      return { status: 'pending_review', reason: err.message };
    }
  }

  // --- Tip transfer (100% to the teen) ---
  // If the base already went through but the tip fails, we don't roll back —
  // the base money is already in the parent's account. We log the tip failure
  // and notify admins so they can retry from the payout queue.
  if (tipAmount > 0) {
    try {
      const result = await createTransfer(stripe, {
        amount: tipAmount,
        sourceTransaction: tipCharge,
        destination: dest.stripe_connect_account_id,
        bookingId: booking.id,
        purpose: 'tip',
      });
      if (result) {
        transferIds.push(result.id);
        totalTransferred += result.amount;
      }
    } catch (err) {
      console.error('Tip transfer failed:', err.message);
      // Mark as pending_review so processPayout can retry. The idempotency
      // key payout_<bookingId>_base prevents a duplicate base transfer on retry.
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: `Tip transfer failed (base succeeded): ${err.message}`,
        ...(transferIds.length > 0 ? { stripe_transfer_id: transferIds.join(',') } : {}),
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Tip transfer needs retry',
        body: `Base payout for "${booking.listing_title}" ${transferIds.length > 0 ? 'succeeded' : 'also failed'} but the ${money(tipAmount)} tip transfer failed: ${err.message}. Retry from the admin payout queue.`,
        link: '/admin',
      });
      return { status: 'pending_review', reason: err.message };
    }
  }

  if (totalTransferred <= 0) {
    await svc.Booking.update(booking.id, {
      payout_status: 'pending_review',
      payout_review_reason: 'No transfer could be created — both charges had insufficient net',
    });
    return { status: 'pending_review', reason: 'Insufficient charge net' };
  }

  await svc.Booking.update(booking.id, {
    payout_status: 'transferred',
    stripe_transfer_id: transferIds.join(','),
    transferred_at: new Date().toISOString(),
    payout_review_reason: '',
  });

  await svc.Notification.create({
    user_id: destUserId,
    type: 'payment',
    title: 'Payout on its way to your bank 🏦',
    body: `${money(totalTransferred)} from "${booking.listing_title}" was transferred to your bank ending in ${dest.bank_last4 || '••••'}. It typically arrives in 1–2 business days.`,
    link: returnLink,
  });

  if (booking.parent_user_id) {
    await notifyParentPayoutSent(base44, {
      parentUserId: booking.parent_user_id,
      amount: totalTransferred,
      jobTitle: booking.listing_title,
      bankLast4: dest.bank_last4,
      origin: Deno.env.get('BASE44_APP_URL') || '',
    });
  }

  await notifyOwnerTransaction(base44, {
    type: 'Payout transfer',
    title: `"${booking.listing_title}" — ${money(totalTransferred)} to ${isIndependent ? 'teen' : 'parent'}`,
    details: `Booking: ${booking.id}\nRecipient: ${destUserId}\nBank ending in: ${dest.bank_last4 || '••••'}\nTransfer IDs: ${transferIds.join(', ')}`,
  });

  return { status: 'transferred', transferIds };
}