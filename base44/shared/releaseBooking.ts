// Finalizes a released booking payment: booking update, earnings record, wallet
// credit, Stripe Connect transfer to the parent, notifications, and referral
// completion. The tip amount passed here must already have been charged through
// Stripe (or be zero).
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export async function releaseBookingPayment(base44, booking, tip) {
  const svc = base44.asServiceRole.entities;
  const tipAmt = Math.max(0, Math.round((Number(tip) || 0) * 100) / 100);
  // Enforce the 85/15 split server-side: the teen nets 85% of the job price,
  // the platform keeps 15%. Tips pass through 100% to the teen.
  const gross = Math.round((Number(booking.price_total) || 0) * 100) / 100;
  const platformFee = Math.round(gross * 0.15 * 100) / 100;
  const netBase = Math.round((gross - platformFee) * 100) / 100;
  const teenGets = Math.round((netBase + tipAmt) * 100) / 100;

  await svc.Booking.update(booking.id, {
    payment_status: 'released',
    tip_amount: tipAmt,
    platform_fee: platformFee,
    net_amount: netBase,
    released_at: new Date().toISOString(),
  });

  await svc.EarningsRecord.create({
    teen_user_id: booking.teen_user_id,
    parent_user_id: booking.parent_user_id || '',
    booking_id: booking.id,
    listing_title: booking.listing_title,
    buyer_name: booking.buyer_name,
    amount: Math.round(((booking.price_total || 0) + tipAmt) * 100) / 100,
    net_amount: teenGets,
    occurred_at: new Date().toISOString(),
    tax_year: new Date().getFullYear(),
  });

  // Increment jobs_completed for both the teen and the buyer — this is the
  // single point where a booking's payment is released, so it fires once.
  const [teenProfiles, buyerProfiles] = await Promise.all([
    svc.TeenProfile.filter({ user_id: booking.teen_user_id }),
    svc.BuyerProfile.filter({ user_id: booking.buyer_user_id }),
  ]);
  if (teenProfiles[0]) {
    await svc.TeenProfile.update(teenProfiles[0].id, {
      jobs_completed: (teenProfiles[0].jobs_completed || 0) + 1,
    });
  }
  if (buyerProfiles[0]) {
    await svc.BuyerProfile.update(buyerProfiles[0].id, {
      jobs_completed: (buyerProfiles[0].jobs_completed || 0) + 1,
    });
  }

  // Credit the teen's wallet (created server-side if missing)
  const wallets = await svc.WalletAccount.filter({ teen_user_id: booking.teen_user_id });
  const wallet = wallets[0] || await svc.WalletAccount.create({ teen_user_id: booking.teen_user_id, balance: 0 });
  await svc.WalletTransaction.create({
    teen_user_id: booking.teen_user_id,
    type: 'earning',
    amount: teenGets,
    description: `"${booking.listing_title}" — ${booking.buyer_name}${tipAmt > 0 ? ` (incl. ${money(tipAmt)} tip)` : ''}`,
    occurred_at: new Date().toISOString(),
  });
  await svc.WalletAccount.update(wallet.id, {
    balance: Math.round(((wallet.balance || 0) + teenGets) * 100) / 100,
  });

  // Notifications
  await svc.Notification.create({
    user_id: booking.teen_user_id,
    type: 'payment',
    title: tipAmt > 0 ? `You got paid — plus a ${money(tipAmt)} tip! 🎉` : 'You got paid!',
    body: `${money(teenGets)} landed in your Blockwork Wallet for "${booking.listing_title}".`,
    link: '/teen/wallet',
  });
  // Delay the actual Stripe Connect transfer by 7 days to allow the buyer's
  // charge to fully settle. The payout_status is set to awaiting_settlement
  // with a payout_eligible_at timestamp; a daily scheduled workflow
  // (processSettledPayouts) picks it up and calls attemptBookingPayout once
  // the settlement period passes.
  const SETTLEMENT_DAYS = 7;
  const eligibleAt = new Date(Date.now() + SETTLEMENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await svc.Booking.update(booking.id, {
    payout_status: 'awaiting_settlement',
    payout_eligible_at: eligibleAt,
  });

  const isIndependent = !booking.parent_user_id;
  const notifyUserId = isIndependent ? booking.teen_user_id : booking.parent_user_id;
  if (notifyUserId) {
    await svc.Notification.create({
      user_id: notifyUserId,
      type: 'payment',
      title: 'Payout settling',
      body: `${money(teenGets)} from "${booking.listing_title}" is settling. It'll be sent to your bank in about ${SETTLEMENT_DAYS} days once the payment clears.`,
      link: isIndependent ? '/teen' : '/parent/payouts',
    });
  }

  return teenGets;
}