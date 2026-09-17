import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { haversineMiles } from '../../shared/geo.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';
import { getDeliveryMode, isRemovedCategory, generateSessionLink } from '../../shared/deliveryMode.ts';
import { enforceBookingHours } from '../../shared/workHourEnforcement.ts';
import { calculatePlatformFee, calculateNetAmount } from '../../shared/platformFee.ts';
import { getSafeOrigin, safeOriginFromString } from '../../shared/safeOrigin.ts';
import { nextOccurrenceDate } from '../../shared/recurringDates.ts';
import { getStripeContext } from '../../shared/stripeEnv.ts';
import { MAX_UNIT_PRICE, MAX_ESTIMATED_HOURS } from '../../shared/pricing.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId, scheduledStart, address, notes, recurrence, hours, endDate, origin: clientOrigin } = await req.json();
    if (!listingId) {
      return Response.json({ error: 'listingId is required' }, { status: 400 });
    }

    const listing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    // Idempotency: if an identical pending booking already exists for the same
    // buyer, listing, and scheduled time within the last 60 seconds, return it
    // instead of creating a duplicate. Protects against double-taps, retry
    // storms, and UI regressions (e.g. SlideToConfirm double-fire).
    if (scheduledStart) {
      const recentBookings = await base44.asServiceRole.entities.Booking.filter({
        buyer_user_id: user.id,
        listing_id: listingId,
        status: 'pending_parent_approval',
      }, '-created_date', 10);
      const targetTime = new Date(scheduledStart).toISOString();
      const now = Date.now();
      const dupe = recentBookings.find(b =>
        b.scheduled_start === targetTime &&
        (now - new Date(b.created_date).getTime()) < 60_000
      );
      if (dupe) {
        // Return the existing booking's checkout URL so the buyer can still pay
        // without creating a second booking record.
        if (dupe.stripe_session_id) {
          const { stripe } = await getStripeContext(base44);
          try {
            const session = await stripe.checkout.sessions.retrieve(dupe.stripe_session_id);
            if (session.url) {
              return Response.json({ bookingId: dupe.id, url: session.url });
            }
          } catch { /* session may have expired — fall through to create a new one */ }
        }
        return Response.json({ bookingId: dupe.id, paid: dupe.payment_status === 'held' });
      }
    }

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

    const hoursNum = listing.price_model === 'HOURLY'
      ? Number(hours || listing.estimated_hours || 2)
      : 2;
    if (listing.price_model === 'HOURLY' && (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > MAX_ESTIMATED_HOURS)) {
      return Response.json(
        { error: `Please select a duration between 1 and ${MAX_ESTIMATED_HOURS} hours.` },
        { status: 400 }
      );
    }
    const total = listing.price_model === 'HOURLY' ? Number(listing.price) * hoursNum : Number(listing.price);
    if (total <= 0 || total > MAX_UNIT_PRICE) {
      return Response.json(
        { error: `Total exceeds the maximum allowed per booking ($${MAX_UNIT_PRICE}). Please reduce the hours or price.` },
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
    const bookingStatus = 'pending_parent_approval';

    const isRecurring = !!recurrence && recurrence !== 'none';

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
      is_recurring: isRecurring,
      recurrence: isRecurring ? recurrence : undefined,
      status: bookingStatus,
      price_total: total,
      charge_amount: buyerPays,
      estimated_hours: estimatedHours,
      platform_fee,
      net_amount,
    });

    // When recurring, create a RecurringSeries to track and generate
    // future occurrences. The first booking is the first occurrence.
    let recurringSeriesId: string | undefined;
    if (isRecurring && scheduledStart) {
      const startDate = new Date(scheduledStart);
      const dayOfWeek = startDate.getDay();
      const dayOfMonth = startDate.getDate();
      const timeOfDay = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      const nextAt = nextOccurrenceDate(recurrence, startDate, dayOfWeek, dayOfMonth, timeOfDay);

      const series = await base44.asServiceRole.entities.RecurringSeries.create({
        listing_id: listing.id,
        listing_title: listing.title,
        teen_user_id: listing.teen_user_id,
        teen_display_name: listing.teen_display_name,
        buyer_user_id: user.id,
        buyer_name: buyerName,
        parent_user_id: parentUserId,
        recurrence,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        start_time: timeOfDay,
        hours: estimatedHours,
        delivery_mode: deliveryMode,
        address: isOnline ? '' : address,
        notes: notes || '',
        price_total: total,
        end_date: endDate || undefined,
        parent_approved: false,
        status: 'active',
        next_occurrence_at: nextAt.toISOString(),
        occurrence_count: 1,
      });
      recurringSeriesId = series.id;
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        recurring_series_id: series.id,
      });
    }

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
      is_confirmed: false,
    });

    base44.analytics.track({ eventName: 'booking_created' });

    // Create a Stripe Checkout session for the upfront escrow payment so the
    // neighbor pays when they book (not at job start). The webhook marks the
    // booking payment_status = 'held' when the charge clears. If the parent
    // declines, the escrow is refunded.
    const chargeAmount = booking.charge_amount ?? total;
    const cents = Math.round(Number(chargeAmount) * 100);
    if (cents >= 50) {
      const { stripe, testMode } = await getStripeContext(base44);
      const origin = clientOrigin ? safeOriginFromString(clientOrigin) : getSafeOrigin(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: booking.listing_title || 'Blockwork job',
              description: 'Held in escrow until the job is confirmed complete. Refunded if the parent declines.',
            },
            unit_amount: cents,
          },
          quantity: 1,
        }],
        success_url: `${origin}/bookings/${booking.id}?paid=1`,
        cancel_url: `${origin}/bookings/${booking.id}`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          booking_id: booking.id,
        },
        payment_intent_data: { metadata: { booking_id: booking.id, base44_app_id: Deno.env.get('BASE44_APP_ID') } },
      });
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        stripe_session_id: session.id,
        is_test_mode: testMode,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: listing.teen_user_id,
        type: 'booking',
        title: 'New booking request',
        body: `"${listing.title}" was booked by ${buyerName}. We'll notify you once payment is confirmed.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      return Response.json({ bookingId: booking.id, url: session.url });
    }

    // Charge below Stripe's $0.50 minimum — mark payment as held. The booking
    // stays at pending_parent_approval until the parent approves (decideBooking).
    if (cents > 0) {
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        payment_status: 'held',
      });
      if (parentUserId) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: parentUserId,
          type: 'booking',
          title: 'Payment confirmed — please approve',
          body: `${buyerName}'s payment for "${listing.title}" is held in escrow. Please review and approve this booking.`,
          link: `/bookings/${booking.id}`,
          read: false,
        });
      }
      await base44.asServiceRole.entities.Notification.create({
        user_id: listing.teen_user_id,
        type: 'booking',
        title: 'New booking request',
        body: `"${listing.title}" was booked by ${buyerName}. Waiting for parent approval before the job is confirmed.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }

    return Response.json({ bookingId: booking.id, paid: cents > 0 && cents < 50 });
  } catch (error) {
    console.error('createBooking error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});