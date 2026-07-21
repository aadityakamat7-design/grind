import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, tipAmount } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (booking.status !== 'completed' || booking.payment_status !== 'held') {
      return Response.json({ error: 'Payment cannot be released for this booking' }, { status: 400 });
    }

    const tip = Math.max(0, Math.round((Number(tipAmount) || 0) * 100) / 100);
    const teenGets = Math.round(((booking.net_amount || 0) + tip) * 100) / 100;

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      payment_status: 'released',
      tip_amount: tip,
    });

    await base44.asServiceRole.entities.EarningsRecord.create({
      teen_user_id: booking.teen_user_id,
      booking_id: booking.id,
      listing_title: booking.listing_title,
      buyer_name: booking.buyer_name,
      amount: Math.round(((booking.price_total || 0) + tip) * 100) / 100,
      net_amount: teenGets,
      occurred_at: new Date().toISOString(),
      tax_year: new Date().getFullYear(),
    });

    // Credit the teen's wallet (created server-side if missing)
    const wallets = await base44.asServiceRole.entities.WalletAccount.filter({ teen_user_id: booking.teen_user_id });
    const wallet = wallets[0] || await base44.asServiceRole.entities.WalletAccount.create({ teen_user_id: booking.teen_user_id, balance: 0 });
    await base44.asServiceRole.entities.WalletTransaction.create({
      teen_user_id: booking.teen_user_id,
      type: 'earning',
      amount: teenGets,
      description: `"${booking.listing_title}" — ${booking.buyer_name}${tip > 0 ? ` (incl. $${tip.toFixed(2)} tip)` : ''}`,
      occurred_at: new Date().toISOString(),
    });
    await base44.asServiceRole.entities.WalletAccount.update(wallet.id, {
      balance: Math.round(((wallet.balance || 0) + teenGets) * 100) / 100,
    });

    return Response.json({ success: true, teenGets });
  } catch (error) {
    console.error('releasePayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});