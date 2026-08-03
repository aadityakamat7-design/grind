import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns a single booking with financial fields stripped based on the
// viewer's role, so teens can't see the gross price or platform fee, and
// neighbors can't see the teen's net earnings.
//   Teen/Parent: keep net_amount, tip_amount, payment/payout status
//                strip price_total, platform_fee, charge_amount
//   Buyer:       keep price_total, charge_amount, tip_amount, payment status
//                strip net_amount, platform_fee
//   Admin:       keep everything
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const isTeen = user.id === booking.teen_user_id;
    const isBuyer = user.id === booking.buyer_user_id;
    const isParent = user.id === booking.parent_user_id;
    const isAdmin = user.app_role === 'admin';

    if (!isTeen && !isBuyer && !isParent && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let stripped = { ...booking };
    if (isTeen || isParent) {
      delete stripped.price_total;
      delete stripped.platform_fee;
      delete stripped.charge_amount;
    } else if (isBuyer) {
      delete stripped.net_amount;
      delete stripped.platform_fee;
    }

    return Response.json({ booking: stripped });
  } catch (error) {
    console.error('getBookingDetail error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});