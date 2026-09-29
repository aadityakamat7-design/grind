import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyUser, notifyBookingParties,
} from '../../shared/adminAction.ts';
import { geocodeAddress } from '../../shared/geocode.ts';
import { haversineMiles } from '../../shared/geo.ts';

// Admin changes the address of an in-person job. The new address is re-checked
// against the California rules and the teen's service radius, and for a minor
// the booking always goes back to the parent — where a teen works is a safety
// decision, not a data correction.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const address = String(body?.address || '').trim();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!address) return Response.json({ error: 'Enter the new job address.' }, { status: 400 });
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    if (booking.delivery_mode !== 'outdoor' || booking.is_physical === false) {
      return Response.json({ error: 'This is an online job, so it has no service address.' }, { status: 400 });
    }
    if (['completed', 'cancelled', 'cancelled_by_admin', 'refunded', 'abandoned', 'denied'].includes(booking.status)) {
      return Response.json({ error: 'This booking is closed, so its address can no longer be changed.' }, { status: 400 });
    }

    // Re-run the location rules on the new address.
    let geo = null;
    try {
      geo = await geocodeAddress(address);
    } catch (err) {
      console.error('adminSetBookingAddress geocode failed:', err.message);
      return Response.json({ error: 'We couldn\u2019t look up that address. Check it and try again.' }, { status: 400 });
    }
    if ((geo?.state || '').toUpperCase() !== 'CA') {
      return Response.json(
        { error: 'Blockwork only operates in California, and this address is outside it.' },
        { status: 403 },
      );
    }

    // Distance check against the teen's service radius, when we have coordinates.
    const [privates, teenProfiles] = await Promise.all([
      svc.TeenPrivateData.filter({ user_id: booking.teen_user_id }),
      svc.TeenProfile.filter({ user_id: booking.teen_user_id }),
    ]);
    const home = privates[0] || null;
    const teenProfile = teenProfiles[0] || null;
    if (home?.latitude != null && home?.longitude != null && geo?.lat != null) {
      const radius = Number(teenProfile?.service_radius_miles) || 3;
      const distance = haversineMiles(home.latitude, home.longitude, geo.lat, geo.lng);
      if (distance > radius) {
        return Response.json(
          {
            error: `That address is ${distance.toFixed(1)} miles from this teen, outside their ${radius}-mile service area. Move the job closer or agree a new radius with the teen first.`,
          },
          { status: 403 },
        );
      }
    }

    const before = bookingSnapshot(booking);
    const isMinor = !!booking.parent_user_id;
    const nextStatus = isMinor ? 'pending_parent_approval' : booking.status;

    await svc.Booking.update(booking.id, {
      address,
      status: nextStatus,
      admin_action_at: new Date().toISOString(),
    });

    const where = geo.city ? `${geo.city}, CA` : 'the new address';

    await notifyBookingParties(base44, booking, {
      type: 'booking',
      title: 'Job location changed by Blockwork support',
      body: `"${booking.listing_title}" is now at ${where}.${isMinor ? ' It needs the parent\u2019s approval again before it goes ahead.' : ''}`,
      link: `/bookings/${booking.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'change_address',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.teen_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: { ...bookingSnapshot({ ...booking, address, status: nextStatus }), resolved_city: geo.city || '' },
      summary: `Moved "${booking.listing_title}" to ${where}${isMinor ? ' — sent back to the parent for approval' : ''}.`,
      ip,
    });

    return Response.json({ success: true, status: nextStatus, parent_reapproval: isMinor, resolved_city: geo.city || '' });
  } catch (error) {
    console.error('adminSetBookingAddress error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});