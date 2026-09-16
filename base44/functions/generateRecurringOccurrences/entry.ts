import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';
import { haversineMiles } from '../../shared/geo.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';
import { getDeliveryMode, isRemovedCategory, generateSessionLink } from '../../shared/deliveryMode.ts';
import { enforceBookingHours } from '../../shared/workHourEnforcement.ts';
import { calculatePlatformFee, calculateNetAmount } from '../../shared/platformFee.ts';
import { notifyParentApprovalNeeded } from '../../shared/notifyParent.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';
import { getStripeContext } from '../../shared/stripeEnv.ts';
import { nextOccurrenceDate } from '../../shared/recurringDates.ts';

// Called by a daily workflow. For each active RecurringSeries whose
// next_occurrence_at is within the generation window (3 days ahead),
// re-validate all safety rules for that specific date and create a
// new Booking occurrence — each with its own escrow charge.
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

    const base44 = createClientFromRequest(req);
    // System-level function — guarded by workflow secret (called by workflow).
    const now = new Date();
    const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead

    const seriesList = await base44.asServiceRole.entities.RecurringSeries.filter({
      status: 'active',
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const series of seriesList) {
      const nextAt = series.next_occurrence_at ? new Date(series.next_occurrence_at) : null;
      if (!nextAt || nextAt > horizon) continue;

      // Check end date
      if (series.end_date && nextAt > new Date(series.end_date + 'T23:59:59')) {
        await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'ended' });
        continue;
      }

      // Handle skip flag
      if (series.skip_next) {
        const after = nextOccurrenceDate(
          series.recurrence, nextAt, series.day_of_week, series.day_of_month, series.start_time,
        );
        await base44.asServiceRole.entities.RecurringSeries.update(series.id, {
          next_occurrence_at: after.toISOString(),
          skip_next: false,
        });
        skipped++;
        continue;
      }

      try {
        // Fetch all the data needed for validation
        const [listing, teenProfiles, buyerProfiles, teenPrivate] = await Promise.all([
          base44.asServiceRole.entities.Listing.get(series.listing_id),
          base44.asServiceRole.entities.TeenProfile.filter({ user_id: series.teen_user_id }),
          base44.asServiceRole.entities.BuyerProfile.filter({ user_id: series.buyer_user_id }),
          base44.asServiceRole.entities.TeenPrivateData.filter({ user_id: series.teen_user_id }),
        ]);
        const teenProfile = teenProfiles[0];
        const buyerProfile = buyerProfiles[0];
        const teenPrivateData = teenPrivate[0];

        if (!listing || !teenProfile || !buyerProfile) {
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
          errors.push(`Series ${series.id}: missing listing/profile data — paused`);
          continue;
        }

        if (teenProfile.status === 'suspended') {
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
          await notifySeriesPaused(base44, series, 'teen is no longer available');
          errors.push(`Series ${series.id}: teen suspended — paused`);
          continue;
        }

        if (isRemovedCategory(listing.category)) {
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'cancelled' });
          await notifySeriesPaused(base44, series, 'category no longer available');
          continue;
        }

        const deliveryMode = series.delivery_mode || getDeliveryMode(listing.category) || 'outdoor';
        const isOnline = deliveryMode === 'online';

        // CA-only check
        if ((teenProfile.state || '').toUpperCase() !== 'CA' || (buyerProfile.state || '').toUpperCase() !== 'CA') {
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
          await notifySeriesPaused(base44, series, 'no longer in California');
          errors.push(`Series ${series.id}: CA-only violation — paused`);
          continue;
        }

        // State match + distance (outdoor only)
        if (!isOnline) {
          if (!teenProfile.state || !buyerProfile.state || teenProfile.state !== buyerProfile.state) {
            await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
            await notifySeriesPaused(base44, series, 'state mismatch');
            continue;
          }
          if (teenPrivateData?.latitude != null && teenPrivateData?.longitude != null &&
              buyerProfile.latitude != null && buyerProfile.longitude != null) {
            const distance = haversineMiles(
              buyerProfile.latitude, buyerProfile.longitude,
              teenPrivateData.latitude, teenPrivateData.longitude,
            );
            const radius = teenProfile.service_radius_miles || 3;
            if (distance > radius) {
              await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
              await notifySeriesPaused(base44, series, `teen moved ${distance.toFixed(1)} mi away`);
              continue;
            }
          }
        }

        // Age gating per occurrence
        const teenAge = getVerifiedAge(teenPrivateData) ?? 0;
        const categoryMinAge = getMinAgeForCategory(teenProfile.state, listing.category);
        if (teenAge < categoryMinAge) {
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, { status: 'paused' });
          await notifySeriesPaused(base44, series, `teen now requires age ${categoryMinAge}+`);
          continue;
        }

        // Hour limits per occurrence
        const estimatedHours = series.hours || 2;
        const hourCheck = await enforceBookingHours(base44, {
          teenUserId: series.teen_user_id,
          state: teenProfile.state,
          age: teenAge,
          scheduledStart: nextAt.toISOString(),
          estimatedHours,
        });
        if (!hourCheck.ok) {
          // Don't pause — just skip this occurrence and try the next one
          const after = nextOccurrenceDate(
            series.recurrence, nextAt, series.day_of_week, series.day_of_month, series.start_time,
          );
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, {
            next_occurrence_at: after.toISOString(),
          });
          await notifySeriesSkipped(base44, series, hourCheck.reason);
          skipped++;
          continue;
        }

        // Use the current listing price (may have changed since series creation)
        const total = listing.price_model === 'HOURLY'
          ? Number(listing.price) * (series.hours || 1)
          : Number(listing.price);
        if (total <= 0 || total > 2000) {
          const after = nextOccurrenceDate(
            series.recurrence, nextAt, series.day_of_week, series.day_of_month, series.start_time,
          );
          await base44.asServiceRole.entities.RecurringSeries.update(series.id, {
            next_occurrence_at: after.toISOString(),
          });
          skipped++;
          continue;
        }

        const platform_fee = calculatePlatformFee(total);
        const net_amount = calculateNetAmount(total);

        // If the parent already approved the first occurrence, future
        // occurrences go straight to confirmed (skip parent approval).
        const bookingStatus = series.parent_approved ? 'confirmed' : 'pending_parent_approval';

        const booking = await base44.asServiceRole.entities.Booking.create({
          listing_id: listing.id,
          listing_title: listing.title,
          teen_user_id: series.teen_user_id,
          teen_display_name: series.teen_display_name,
          parent_user_id: series.parent_user_id,
          buyer_user_id: series.buyer_user_id,
          buyer_name: series.buyer_name,
          scheduled_start: nextAt.toISOString(),
          delivery_mode: deliveryMode,
          address: isOnline ? '' : (series.address || ''),
          is_physical: !isOnline,
          notes: series.notes || '',
          is_recurring: true,
          recurrence: series.recurrence,
          recurring_series_id: series.id,
          status: bookingStatus,
          price_total: total,
          charge_amount: total,
          estimated_hours: estimatedHours,
          platform_fee,
          net_amount,
        });

        if (isOnline) {
          await base44.asServiceRole.entities.Booking.update(booking.id, {
            session_link: generateSessionLink(booking.id),
          });
        }

        // Create a Stripe Checkout session for this occurrence's escrow
        const cents = Math.round(total * 100);
        if (cents >= 50) {
          const { stripe, testMode } = await getStripeContext(base44);
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${booking.listing_title} (recurring)`,
                  description: 'Held in escrow until this occurrence is confirmed complete.',
                },
                unit_amount: cents,
              },
              quantity: 1,
            }],
            success_url: `${APP_BASE_URL}/bookings/${booking.id}?paid=1`,
            cancel_url: `${APP_BASE_URL}/bookings/${booking.id}`,
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
        } else if (cents > 0) {
          await base44.asServiceRole.entities.Booking.update(booking.id, { payment_status: 'held' });
        }

        // Notify both parties about the upcoming occurrence
        const occLabel = nextAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        await base44.asServiceRole.entities.Notification.create({
          user_id: series.buyer_user_id,
          type: 'booking',
          title: `Recurring: ${listing.title} on ${occLabel}`,
          body: `Your ${series.recurrence} ${listing.title} with ${series.teen_display_name} is coming up. Tap to pay and confirm.`,
          link: `/bookings/${booking.id}`,
          read: false,
        });
        await base44.asServiceRole.entities.Notification.create({
          user_id: series.teen_user_id,
          type: 'booking',
          title: `Recurring: ${listing.title} on ${occLabel}`,
          body: `Your ${series.recurrence} ${listing.title} with ${series.buyer_name} is coming up on ${occLabel}.`,
          link: `/bookings/${booking.id}`,
          read: false,
        });
        if (series.parent_user_id && !series.parent_approved) {
          await base44.asServiceRole.entities.Notification.create({
            user_id: series.parent_user_id,
            type: 'booking',
            title: 'Approval needed: recurring booking',
            body: `${series.buyer_name} booked "${listing.title}" with ${series.teen_display_name} (recurring). Tap to review and approve.`,
            link: '/parent/approvals',
            read: false,
          });
          await notifyParentApprovalNeeded(base44.asServiceRole, {
            teenName: series.teen_display_name || 'Your teen',
            jobTitle: listing.title,
            buyerName: series.buyer_name,
            parentUserId: series.parent_user_id,
            origin: APP_BASE_URL,
          });
        }

        // Advance the series to the next occurrence
        const after = nextOccurrenceDate(
          series.recurrence, nextAt, series.day_of_week, series.day_of_month, series.start_time,
        );
        await base44.asServiceRole.entities.RecurringSeries.update(series.id, {
          next_occurrence_at: after.toISOString(),
          last_occurrence_at: now.toISOString(),
          occurrence_count: (series.occurrence_count || 0) + 1,
        });

        base44.analytics.track({ eventName: 'recurring_occurrence_created' });
        generated++;
      } catch (err) {
        failed++;
        errors.push(`Series ${series.id}: ${err.message}`);
      }
    }

    return Response.json({ generated, skipped, failed, errors: errors.slice(0, 10) });
  } catch (error) {
    console.error('generateRecurringOccurrences error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});

async function notifySeriesPaused(base44: any, series: any, reason: string) {
  const msg = `Your recurring "${series.listing_title}" was paused: ${reason}. Tap to resume or cancel.`;
  await base44.asServiceRole.entities.Notification.create({
    user_id: series.buyer_user_id, type: 'booking', title: 'Recurring series paused',
    body: msg, link: `/bookings`, read: false,
  });
  await base44.asServiceRole.entities.Notification.create({
    user_id: series.teen_user_id, type: 'booking', title: 'Recurring series paused',
    body: msg, link: `/bookings`, read: false,
  });
}

async function notifySeriesSkipped(base44: any, series: any, reason: string) {
  const msg = `An occurrence of your recurring "${series.listing_title}" was skipped: ${reason}. The next one is still scheduled.`;
  await base44.asServiceRole.entities.Notification.create({
    user_id: series.buyer_user_id, type: 'booking', title: 'Recurring occurrence skipped',
    body: msg, link: `/bookings`, read: false,
  });
  await base44.asServiceRole.entities.Notification.create({
    user_id: series.teen_user_id, type: 'booking', title: 'Recurring occurrence skipped',
    body: msg, link: `/bookings`, read: false,
  });
}