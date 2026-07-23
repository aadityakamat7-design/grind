import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { haversineMiles } from '../../shared/geo.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId, scheduledStart, address, notes, recurrence, hours } = await req.json();
    if (!listingId || !address) {
      return Response.json({ error: 'listingId and address are required' }, { status: 400 });
    }

    const listing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    const [teenProfiles, buyerProfiles] = await Promise.all([
      base44.asServiceRole.entities.TeenProfile.filter({ user_id: listing.teen_user_id }),
      base44.asServiceRole.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);
    const teenProfile = teenProfiles[0];
    const buyerProfile = buyerProfiles[0];
    if (!teenProfile) return Response.json({ error: 'Teen profile not found' }, { status: 404 });
    if (!buyerProfile) return Response.json({ error: 'Please complete your profile first' }, { status: 400 });

    if (
      teenProfile.latitude == null || teenProfile.longitude == null ||
      buyerProfile.latitude == null || buyerProfile.longitude == null
    ) {
      return Response.json(
        { error: 'Location not verified for this teen or your profile yet. Please re-save your address.' },
        { status: 400 }
      );
    }

    if (!teenProfile.state || !buyerProfile.state || teenProfile.state !== buyerProfile.state) {
      return Response.json(
        { error: 'This teen is in a different state — bookings must stay within the same state for legal compliance.' },
        { status: 400 }
      );
    }

    const distance = haversineMiles(
      buyerProfile.latitude, buyerProfile.longitude,
      teenProfile.latitude, teenProfile.longitude
    );
    const radius = teenProfile.service_radius_miles || 3;
    if (distance > radius) {
      return Response.json(
        { error: `You're ${distance.toFixed(1)} miles away — outside ${teenProfile.display_name || 'this teen'}'s ${radius}-mile service area.` },
        { status: 400 }
      );
    }

    const total = listing.price_model === 'HOURLY' ? Number(listing.price) * Number(hours || 1) : Number(listing.price);
    if (total > 2000) {
      return Response.json(
        { error: 'Total exceeds the maximum allowed per booking ($2,000). Please reduce the hours or price.' },
        { status: 400 }
      );
    }
    const platform_fee = Math.round(total * 0.15 * 100) / 100;
    const net_amount = Math.round((total - platform_fee) * 100) / 100;
    const creditApplied = Math.min(Number(buyerProfile.referral_credit || 0), total);
    const buyerPays = Math.round((total - creditApplied) * 100) / 100;

    const links = await base44.asServiceRole.entities.ParentTeenLink.filter({
      teen_user_id: listing.teen_user_id, status: 'confirmed',
    });
    const parentUserId = links[0]?.parent_user_id || '';
    const buyerName = user.full_name?.split(' ')[0] || 'Neighbor';

    const booking = await base44.asServiceRole.entities.Booking.create({
      listing_id: listing.id,
      listing_title: listing.title,
      teen_user_id: listing.teen_user_id,
      teen_display_name: listing.teen_display_name,
      parent_user_id: parentUserId,
      buyer_user_id: user.id,
      buyer_name: buyerName,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      address,
      notes: notes || '',
      is_recurring: !!recurrence && recurrence !== 'none',
      recurrence: recurrence && recurrence !== 'none' ? recurrence : undefined,
      status: 'pending_parent_approval',
      price_total: total,
      charge_amount: buyerPays,
      platform_fee,
      net_amount,
    });

    if (creditApplied > 0) {
      await base44.asServiceRole.entities.BuyerProfile.update(buyerProfile.id, {
        referral_credit: Math.round(((buyerProfile.referral_credit || 0) - creditApplied) * 100) / 100,
      });
    }

    await base44.asServiceRole.entities.MessageThread.create({
      booking_id: booking.id,
      listing_title: listing.title,
      buyer_user_id: user.id,
      buyer_name: buyerName,
      teen_user_id: listing.teen_user_id,
      teen_display_name: listing.teen_display_name,
      parent_user_id: parentUserId,
      participant_ids: [user.id, listing.teen_user_id, parentUserId].filter(Boolean),
      is_confirmed: false,
    });

    if (parentUserId) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: parentUserId,
        type: 'approval',
        title: 'Booking needs your approval',
        body: `${buyerName} booked "${listing.title}" with ${listing.teen_display_name}.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }
    await base44.asServiceRole.entities.Notification.create({
      user_id: listing.teen_user_id,
      type: 'booking',
      title: 'New booking request',
      body: `"${listing.title}" — waiting on parent approval.`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    return Response.json({ bookingId: booking.id });
  } catch (error) {
    console.error('createBooking error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});