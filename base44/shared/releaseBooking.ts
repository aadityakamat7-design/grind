import { attemptBookingPayout } from './payoutTransfer.ts';

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
    booking_id: booking.id,
    listing_title: booking.listing_title,
    buyer_name: booking.buyer_name,
    amount: Math.round(((booking.price_total || 0) + tipAmt) * 100) / 100,
    net_amount: teenGets,
    occurred_at: new Date().toISOString(),
    tax_year: new Date().getFullYear(),
  });

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
    body: `${money(teenGets)} landed in your Grind Wallet for "${booking.listing_title}".`,
    link: '/teen/wallet',
  });
  // Transfer the net payout (after platform fee) to the parent's Stripe Connect
  // account — never the teen's. Sends its own parent notification per outcome.
  await attemptBookingPayout(base44, { ...booking, platform_fee: platformFee, net_amount: netBase, tip_amount: tipAmt });

  // Two-sided referral reward on the buyer's first completed booking
  const refs = await svc.Referral.filter({ referred_user_id: booking.buyer_user_id, status: 'pending' });
  const ref = refs[0];
  if (ref) {
    await svc.Referral.update(ref.id, {
      status: 'completed',
      booking_id: booking.id,
      completed_at: new Date().toISOString(),
    });
    const reward = ref.reward_amount || 10;
    const [referrerProfiles, referredProfiles] = await Promise.all([
      svc.BuyerProfile.filter({ user_id: ref.referrer_user_id }),
      svc.BuyerProfile.filter({ user_id: ref.referred_user_id }),
    ]);
    if (referrerProfiles[0]) {
      await svc.BuyerProfile.update(referrerProfiles[0].id, {
        referral_credit: (referrerProfiles[0].referral_credit || 0) + reward,
      });
    }
    if (referredProfiles[0]) {
      await svc.BuyerProfile.update(referredProfiles[0].id, {
        referral_credit: (referredProfiles[0].referral_credit || 0) + reward,
      });
    }
    await svc.Notification.create({
      user_id: ref.referrer_user_id,
      type: 'referral',
      title: `You earned ${money(reward)} in credit! 🎉`,
      body: `${ref.referred_name} completed their first booking. Your credit applies automatically to your next booking.`,
      link: '/buyer',
    });
    await svc.Notification.create({
      user_id: ref.referred_user_id,
      type: 'referral',
      title: `${money(reward)} credit unlocked! 🎉`,
      body: `Thanks for joining through ${ref.referrer_name}'s invite — your credit applies automatically to your next booking.`,
      link: '/buyer',
    });
  }

  return teenGets;
}