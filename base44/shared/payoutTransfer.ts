import { getStripeForApp } from './stripeEnv.ts';
import { notifyAdmins } from './notifyAdmins.ts';
import { notifyParentPayoutSent } from './notifyParent.ts';
import { reviewBookingPayout, saveReview } from './payoutReview.ts';
import { notifyOwnerTransaction } from './notifyOwnerTransaction.ts';
import { calculateTipNet } from './platformFee.ts';
import { APP_BASE_URL } from './safeOrigin.ts';

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
// destination is the parent's Connect account (requires a confirmed
// ParentTeenLink); for independent 18+ teens (no parent on the booking) it
// is the teen's own Connect account.
//
// Pre-transfer eligibility checks run in order:
//   1. Destination resolution (blocked_no_destination if none)
//   2. Account active (awaiting_active_account if pending/restricted)
//   3. 72-hour new-account hold (awaiting_new_account_hold)
//   4. Duplicate detection (duplicate_blocked if transfer already exists)
//   5. Review agent + first-payout/over-$100 routing (pending_review)
//
// Transfer failures are caught and left in a retryable pending_review state.
export async function attemptBookingPayout(base44, booking, { skipReview = false } = {}) {
  const svc = base44.asServiceRole.entities;
  const baseAmount = Math.round((Number(booking.net_amount) || 0) * 100) / 100;
  const tipAmount = calculateTipNet(Math.round((Number(booking.tip_amount) || 0) * 100) / 100);
  const totalAmount = Math.round((baseAmount + tipAmount) * 100) / 100;
  if (totalAmount <= 0) return { status: 'pending_release' };

  // --- 1. Resolve the correct destination ---
  const isIndependent = !booking.parent_user_id;
  const destUserId = isIndependent ? booking.teen_user_id : booking.parent_user_id;
  const returnLink = isIndependent ? '/teen' : '/parent/payouts';

  let dest;
  if (isIndependent) {
    const profiles = await svc.TeenProfile.filter({ user_id: booking.teen_user_id });
    dest = profiles[0];
  } else {
    // For a minor teen: require a confirmed ParentTeenLink before routing to the parent
    const links = await svc.ParentTeenLink.filter({
      parent_user_id: booking.parent_user_id,
      teen_user_id: booking.teen_user_id,
    });
    const confirmedLink = links.find((l) => l.status === 'confirmed');
    if (!confirmedLink) {
      await svc.Booking.update(booking.id, {
        payout_status: 'blocked_no_destination',
        payout_review_reason: 'No confirmed parent-teen link — cannot resolve payout destination',
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Payout blocked — no confirmed parent link',
        body: `"${booking.listing_title}" — the parent-teen link is not confirmed. Payout cannot proceed until the link is verified.`,
        link: '/admin',
      });
      return { status: 'blocked_no_destination', reason: 'No confirmed parent-teen link' };
    }
    const profiles = await svc.ParentProfile.filter({ user_id: booking.parent_user_id });
    dest = profiles[0];
  }

  // No Connect account at all
  if (!dest?.stripe_connect_account_id) {
    await svc.Booking.update(booking.id, {
      payout_status: 'blocked_no_destination',
      payout_review_reason: `No Connect account for ${isIndependent ? 'teen' : 'parent'}`,
    });
    await svc.Notification.create({
      user_id: destUserId,
      type: 'payment',
      title: 'Connect a bank to receive this payout',
      body: `${money(totalAmount)} from "${booking.listing_title}" is waiting. Connect your bank in Payouts to receive it.`,
      link: returnLink,
    });
    return { status: 'blocked_no_destination', reason: 'No Connect account' };
  }

  // --- 2. Account must be active (not pending/restricted) ---
  if (dest.connect_status !== 'active') {
    await svc.Booking.update(booking.id, {
      payout_status: 'awaiting_active_account',
      payout_review_reason: `Connect account status: ${dest.connect_status}`,
    });
    await svc.Notification.create({
      user_id: destUserId,
      type: 'payment',
      title: 'Finish bank setup to receive this payout',
      body: `${money(totalAmount)} from "${booking.listing_title}" is waiting. Complete your bank setup in Payouts to receive it.`,
      link: returnLink,
    });
    return { status: 'awaiting_active_account' };
  }

  // --- 3. 72-hour new-account withdrawal hold ---
  const NEW_ACCOUNT_HOLD_MS = 72 * 60 * 60 * 1000;
  const accountCreatedAt = dest.payout_account_created_at ? new Date(dest.payout_account_created_at) : null;
  if (accountCreatedAt && (Date.now() - accountCreatedAt.getTime()) < NEW_ACCOUNT_HOLD_MS) {
    const eligibleAt = new Date(accountCreatedAt.getTime() + NEW_ACCOUNT_HOLD_MS).toISOString();
    await svc.Booking.update(booking.id, {
      payout_status: 'awaiting_new_account_hold',
      new_account_hold_eligible_at: eligibleAt,
      payout_review_reason: 'New account security hold — first payouts release 72 hours after account setup',
    });
    await svc.Notification.create({
      user_id: destUserId,
      type: 'payment',
      title: 'New account security hold',
      body: `${money(totalAmount)} from "${booking.listing_title}" is on a 72-hour security hold for your new account. It becomes available ${new Date(eligibleAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      link: returnLink,
    });
    return { status: 'awaiting_new_account_hold', eligibleAt };
  }

  // --- 4. Duplicate transfer prevention ---
  // If a real Stripe transfer ID already exists (not a lock token), this
  // payout was already sent. Block it to prevent a duplicate.
  if (booking.stripe_transfer_id && !booking.stripe_transfer_id.startsWith('lock_')) {
    await svc.Booking.update(booking.id, {
      payout_status: 'duplicate_blocked',
      payout_review_reason: `Transfer already exists: ${booking.stripe_transfer_id}`,
    });
    await notifyAdmins(base44, {
      type: 'payment',
      title: 'Duplicate payout blocked',
      body: `"${booking.listing_title}" already has transfer ID ${booking.stripe_transfer_id}. Payout blocked to prevent a duplicate.`,
      link: '/admin',
    });
    return { status: 'duplicate_blocked', reason: 'Transfer already exists' };
  }

  // --- 5. Review agent + first-payout/over-$100 routing ---
  // First-time payouts and payouts over $100 are ALWAYS routed to manual
  // review — they never auto-transfer. skipReview is set only when an admin
  // has already approved a held payout.
  if (!skipReview) {
    const review = await reviewBookingPayout(base44, booking);
    const forceReview = review.is_first_payout || totalAmount >= REVIEW_THRESHOLD;

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
      return { status: 'pending_review', reason: review.flags.join('; ') };
    }

    if (forceReview || review.recommended_action === 'hold_for_admin') {
      const reason = forceReview
        ? (review.is_first_payout
          ? 'First payout — manual review required'
          : `Payout over $${REVIEW_THRESHOLD} — manual review required`)
        : (review.flags.join('; ') || 'Held for admin review');
      await saveReview(base44, booking, review, { status: 'pending' });
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: reason,
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
        body: `${money(review.amount)} payout for "${booking.listing_title}" held: ${reason}.`,
        link: '/admin',
      });
      return { status: 'pending_review', reason };
    }

    // Auto-approved — record the clearance and proceed to the transfer
    await saveReview(base44, booking, review, { status: 'auto_approved' });
  }

  // --- Execute the transfer ---
  const stripe = await getStripeForApp(base44);
  const baseCharge = await getChargeNet(stripe, booking.stripe_payment_intent_id);
  const tipCharge = await getChargeNet(stripe, booking.tip_stripe_payment_intent_id);

  const transferIds = [];
  let totalTransferred = 0;

  // --- Base transfer (net after platform fee) ---
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
      // Transfer failure — catch, record the reason, and leave in a
      // retryable pending_review state. Never an ambiguous silent failure.
      console.error('Base transfer failed:', err.message);
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: `Transfer failed: ${err.message}`,
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Payout transfer failed',
        body: `Base transfer for "${booking.listing_title}" failed: ${err.message}. Retry from the admin payout queue.`,
        link: '/admin',
      });
      return { status: 'pending_review', reason: err.message };
    }
  }

  // --- Tip transfer (100% to the teen) ---
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
      await svc.Booking.update(booking.id, {
        payout_status: 'pending_review',
        payout_review_reason: `Tip transfer failed (base succeeded): ${err.message}`,
        ...(transferIds.length > 0 ? { stripe_transfer_id: transferIds.join(',') } : {}),
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: 'Tip transfer needs retry',
        body: `Base payout for "${booking.listing_title}" succeeded but the ${money(tipAmount)} tip transfer failed: ${err.message}.`,
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

  // --- Success: transferred ---
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
      origin: APP_BASE_URL,
    });
  }

  await notifyOwnerTransaction(base44, {
    type: 'Payout transfer',
    title: `"${booking.listing_title}" — ${money(totalTransferred)} to ${isIndependent ? 'teen' : 'parent'}`,
    details: `Booking: ${booking.id}\nRecipient: ${destUserId}\nBank ending in: ${dest.bank_last4 || '••••'}\nTransfer IDs: ${transferIds.join(', ')}`,
  });

  return { status: 'transferred', transferIds };
}