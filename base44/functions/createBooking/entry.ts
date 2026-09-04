import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { haversineMiles } from '../../shared/geo.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';
import { getDeliveryMode, isRemovedCategory, generateSessionLink } from '../../shared/deliveryMode.ts';
import { enforceBookingHours } from '../../shared/workHourEnforcement.ts';
import { calculatePlatformFee, calculateNetAmount } from '../../shared/platformFee.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId, scheduledStart, address, notes, recurrence, hours } = await req.json();
    if (!listingId) {
      return Response.json({ error: 'listingId is required' }, { status: 400 });
    }

    const listing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    // Reject removed categories (babysitting, etc.) — teens never enter a home.
    if (isRemovedCategory(listing.category)) {
      return Response.json({ error: 'This category is no longer available on Blockwork.' }, { status: 400 });
    }
    const deliveryMode = listing.delivery_mode || getDeliveryMode(listing.category) || 'outdoor';
    const isOnline = deliveryMode === 'online';

    // Online jobs don't require an address; outdoor jobs do.
    if (!isOnline && !address) {
      return Response.json({ error: 'address is required for outdoor jobs' }, { status: 400 });
    }

    const [teenProfiles, buyerProfiles, teenPrivate] = await Promise.all([
      base44.asServiceRole.entities.TeenProfile.filter({ user_id: listing.teen_user_id }),
      base44.asServiceRole.entities.BuyerProfile.filter({ user_id: user.id }),
      base44.asServiceRole.entities.TeenPrivateData.filter({ user_id: listing.teen_user_id }),
    ]);
    const teenProfile = teenProfiles[0];
    const buyerProfile = buyerProfiles[0];
    const teenPrivateData = teenPrivate[0];
    if (!teenProfile) return Response.json({ error: 'Teen profile not found' }, { status: 404 });
    if (teenProfile.status === 'suspended') {
      return Response.json({ error: 'This teen is not currently available for bookings.' }, { status: 400 });
    }
    if (!buyerProfile) return Response.json({ error: 'Please complete your profile first' }, { status: 400 });

    // CA-only: both the teen and the buyer must be in California
    if ((teenProfile.state || '').toUpperCase() !== 'CA' || (buyerProfile.state || '').toUpperCase() !== 'CA') {
      return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 403 });
    }

    // Location/distance + state matching only for outdoor jobs — online jobs
    // (tutoring, tech help) can cross state lines, so they skip both.
    if (!isOnline) {
      if (
        teenPrivateData?.latitude == null || teenPrivateData?.longitude == null ||
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
    }

    // Block check — either side can block the other
    const [blocksByBuyer, blocksByTeen] = await Promise.all([
      base44.asServiceRole.entities.Block.filter({ blocker_id: user.id, blocked_id: listing.teen_user_id }),
      base44.asServiceRole.entities.Block.filter({ blocker_id: listing.teen_user_id, blocked_id: user.id }),
    ]);
    if (blocksByBuyer.length > 0 || blocksByTeen.length > 0) {
      return Response.json({ error: 'This booking cannot be created.' }, { status: 403 });
    }

    // Guard: a parent can never book their own teen — prevents self-dealing,
    // fake bookings to game ratings/earnings, and the conflict of a parent
    // approving a job they themselves posted.
    const selfDealingLinks = await base44.asServiceRole.entities.ParentTeenLink.filter({
      parent_user_id: user.id,
      teen_user_id: listing.teen_user_id,
      status: 'confirmed',
    });
    if (selfDealingLinks.length > 0) {
      return Response.json({ error: "You can't book your own teen." }, { status: 403 });
    }

    if (!isOnline) {
      const distance = haversineMiles(
        buyerProfile.latitude, buyerProfile.longitude,
        teenPrivateData.latitude, teenPrivateData.longitude
      );
      const radius = teenProfile.service_radius_miles || 3;
      if (distance > radius) {
        return Response.json(
          { error: `You're ${distance.toFixed(1)} miles away — outside ${teenProfile.display_name || 'this teen'}'s ${radius}-mile service area.` },
          { status: 400 }
        );
      }
    }

    const hoursNum = Number(hours);
    if (listing.price_model === 'HOURLY' && (!Number.isFinite(hoursNum) || hoursNum <= 0 || hoursNum > 24)) {
      return Response.json(
        { error: 'Please enter a valid number of hours (between 0 and 24).' },
        { status: 400 }
      );
    }
    const total = listing.price_model === 'HOURLY' ? Number(listing.price) * hoursNum : Number(listing.price);
    if (total <= 0 || total > 2000) {
      return Response.json(
        { error: 'Total exceeds the maximum allowed per booking ($2,000). Please reduce the hours or price.' },
        { status: 400 }
      );
    }
    const platform_fee = calculatePlatformFee(total);
    const net_amount = calculateNetAmount(total);
    const buyerPays = total;

    // No verification gate — teens can receive bookings freely. Parent link
    // is only used for notifications and payout routing at withdrawal time.
    const teenAge = getVerifiedAge(teenPrivateData) ?? 0;

    // Re-validate that the teen is eligible for this listing's category in
    // their state. Uses the verified age — a direct API call can't bypass this.
    const categoryMinAge = getMinAgeForCategory(teenProfile.state, listing.category);
    if (teenAge < categoryMinAge) {
      return Response.json(
        { error: `This teen is not old enough for this category in their state (requires ${categoryMinAge}+).` },
        { status: 403 }
      );
    }

    // Enforce state child-labor hour limits (daily/weekly caps + prohibited
    // time windows) using the teen's verified age. Rejected at the API so a
    // direct call can't bypass it.
    const estimatedHours = listing.price_model === 'HOURLY' ? hoursNum : 2;
    const hourCheck = await enforceBookingHours(base44, {
      teenUserId: listing.teen_user_id,
      state: teenProfile.state,
      age: getVerifiedAge(teenPrivateData),
      scheduledStart,
      estimatedHours,
    });
    if (!hourCheck.ok) {
      return Response.json({ error: hourCheck.reason, nextEligible: hourCheck.nextEligible }, { status: 403 });
    }

    // Look up the parent link for notifications/payout routing — not a gate.
    const links = await base44.asServiceRole.entities.ParentTeenLink.filter({
      teen_user_id: listing.teen_user_id, status: 'confirmed',
    });
    const parentUserId = links[0]?.parent_user_id || '';
    const buyerName = user.full_name?.split(' ')[0] || 'Neighbor';
    const bookingStatus = 'confirmed';

    const booking = await base44.asServiceRole.entities.Booking.create({
      listing_id: listing.id,
      listing_title: listing.title,
      teen_user_id: listing.teen_user_id,
      teen_display_name: listing.teen_display_name,
      parent_user_id: parentUserId,
      buyer_user_id: user.id,
      buyer_name: buyerName,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      delivery_mode: deliveryMode,
      address: isOnline ? '' : address,
      is_physical: !isOnline,
      notes: notes || '',
      is_recurring: !!recurrence && recurrence !== 'none',
      recurrence: recurrence && recurrence !== 'none' ? recurrence : undefined,
      status: bookingStatus,
      price_total: total,
      charge_amount: buyerPays,
      estimated_hours: estimatedHours,
      platform_fee,
      net_amount,
    });

    // For online jobs, generate the video session link now that we have the
    // booking ID, and attach it to the booking.
    if (isOnline) {
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        session_link: generateSessionLink(booking.id),
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
      is_confirmed: true,
    });

    if (parentUserId) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: parentUserId,
        type: 'booking',
        title: 'New booking for your teen',
        body: `${buyerName} booked "${listing.title}" with ${listing.teen_display_name}.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }
    await base44.asServiceRole.entities.Notification.create({
      user_id: listing.teen_user_id,
      type: 'booking',
      title: 'New booking confirmed!',
      body: `"${listing.title}" — the neighbor will pay to confirm.`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    base44.analytics.track({ eventName: 'booking_created' });

    return Response.json({ bookingId: booking.id });
  } catch (error) {
    console.error('createBooking error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});