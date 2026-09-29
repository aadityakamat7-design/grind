import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyUser,
} from '../../shared/adminAction.ts';
import { enforceBookingHours } from '../../shared/workHourEnforcement.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';

// Admin reschedules a booking. The new time is re-validated against the teen's
// age and the state's child-labour hour limits, and for a minor the booking
// goes back to the parent for approval — the payment stays held meanwhile.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId, scheduledStart } = body;
    if (!bookingId || !scheduledStart) {
      return Response.json({ error: 'bookingId and scheduledStart required' }, { status: 400 });
    }
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const when = new Date(scheduledStart);
    if (isNaN(when.getTime())) return Response.json({ error: 'That is not a valid date and time.' }, { status: 400 });
    if (when.getTime() <= Date.now()) {
      return Response.json({ error: 'Pick a time in the future.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const RESCHEDULABLE = ['payment_pending', 'pending_parent_approval', 'confirmed'];
    if (!RESCHEDULABLE.includes(booking.status)) {
      return Response.json(
        { error: `A ${String(booking.status).replace(/_/g, ' ')} booking can't be rescheduled.` },
        { status: 400 },
      );
    }

    // Re-run the age and hour rules for the new time — a reschedule must not be
    // a way to slip a booking outside legal work hours.
    const [teenProfiles, privates, listing] = await Promise.all([
      svc.TeenProfile.filter({ user_id: booking.teen_user_id }),
      svc.TeenPrivateData.filter({ user_id: booking.teen_user_id }),
      booking.listing_id ? svc.Listing.get(booking.listing_id).catch(() => null) : Promise.resolve(null),
    ]);
    const teenProfile = teenProfiles[0] || null;
    const age = getVerifiedAge(privates[0] || null);

    if (teenProfile && listing?.category) {
      const minAge = getMinAgeForCategory(teenProfile.state, listing.category);
      if (age != null && age < minAge) {
        return Response.json(
          { error: `This teen no longer qualifies for ${listing.category.replace(/_/g, ' ')} (requires ${minAge}+).` },
          { status: 403 },
        );
      }
    }

    const hourCheck = await enforceBookingHours(base44, {
      teenUserId: booking.teen_user_id,
      state: teenProfile?.state || null,
      age,
      scheduledStart: when.toISOString(),
      estimatedHours: Number(booking.estimated_hours) || 2,
    });
    if (!hourCheck.ok) {
      return Response.json({ error: hourCheck.reason, nextEligible: hourCheck.nextEligible }, { status: 403 });
    }

    const before = bookingSnapshot(booking);
    const isMinor = !!booking.parent_user_id;

    // A minor's booking always returns to the parent: the time is a safety and
    // supervision decision, not just a calendar change. An 18+ teen keeps their
    // confirmed booking.
    const nextStatus = isMinor ? 'pending_parent_approval' : booking.status;
    await svc.Booking.update(booking.id, {
      scheduled_start: when.toISOString(),
      status: nextStatus,
      admin_action_at: new Date().toISOString(),
    });

    const whenLabel = when.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    if (isMinor) {
      await notifyUser(base44, booking.parent_user_id, {
        type: 'booking',
        title: 'Blockwork moved a job time — your approval is needed',
        body: `"${booking.listing_title}" was moved to ${whenLabel} by Blockwork support. The payment is still held while you decide.`,
        link: `/bookings/${booking.id}`,
      });
    }
    await notifyUser(base44, booking.teen_user_id, {
      type: 'booking',
      title: 'Your job was rescheduled',
      body: `"${booking.listing_title}" was moved to ${whenLabel} by Blockwork support.${isMinor ? ' It needs your parent\u2019s approval again.' : ''}`,
      link: `/bookings/${booking.id}`,
    });
    await notifyUser(base44, booking.buyer_user_id, {
      type: 'booking',
      title: 'Your job was rescheduled',
      body: `"${booking.listing_title}" was moved to ${whenLabel} by Blockwork support.`,
      link: `/bookings/${booking.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'reschedule_booking',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.teen_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: { ...bookingSnapshot({ ...booking, scheduled_start: when.toISOString(), status: nextStatus }) },
      summary: `Moved "${booking.listing_title}" to ${whenLabel}${isMinor ? ' — sent back to the parent for approval' : ''}.`,
      ip,
    });

    return Response.json({ success: true, status: nextStatus, parent_reapproval: isMinor, scheduled_start: when.toISOString() });
  } catch (error) {
    console.error('adminRescheduleBooking error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});