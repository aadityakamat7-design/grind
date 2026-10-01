import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { haversineMiles } from '../../shared/geo.ts';
import { alertParentCheckIn, alertParentCheckOut } from '../../shared/parentAlerts.ts';

// "I'm here" and "Done, heading home" check-ins for in-person jobs, plus the
// same two events for online sessions (joining / leaving the video room counts).
//
// Location is saved ONCE at check-in and once at check-out — never tracked
// continuously. Only the parent and admins can read it, and the cleanup
// workflow deletes it 90 days after the job.
//
// The teen is never blocked by location: out of range or permission denied
// still checks in, and the parent's alert says "Location not confirmed".

const GEO_RADIUS_MILES = 0.155; // ~250 meters
const EARLY_WINDOW_MINUTES = 30;
const LATE_WINDOW_HOURS = 6;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, action, lat, lng, beforePhoto, source } = await req.json();
    if (!bookingId || !['check_in', 'check_out'].includes(action)) {
      return Response.json({ error: 'bookingId and a valid action are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    let booking;
    try {
      booking = await svc.Booking.get(bookingId);
    } catch {
      booking = null;
    }
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    // Only the teen on this booking can check in or out.
    if (user.id !== booking.teen_user_id) {
      return Response.json({ error: 'Only the teen on this job can check in.' }, { status: 403 });
    }

    const isOnline = booking.delivery_mode === 'online';
    const videoSource = isOnline && source === 'video';
    const now = new Date();

    // ── Check in ──
    if (action === 'check_in') {
      if (!['confirmed', 'in_progress'].includes(booking.status)) {
        return Response.json({ error: 'This job has to be approved before you can check in.' }, { status: 400 });
      }
      if (booking.check_in_at) {
        return Response.json({ alreadyDone: true, check_in_at: booking.check_in_at });
      }
      if (booking.scheduled_start) {
        const start = new Date(booking.scheduled_start).getTime();
        const earliest = start - EARLY_WINDOW_MINUTES * 60000;
        const latest = start + LATE_WINDOW_HOURS * 3600000;
        if (now.getTime() < earliest) {
          return Response.json({ error: 'You can check in starting 30 minutes before the job.' }, { status: 400 });
        }
        if (now.getTime() > latest) {
          return Response.json({ error: 'This check-in window has closed.' }, { status: 400 });
        }
      }

      const update: Record<string, unknown> = {
        check_in_at: now.toISOString(),
        check_in_source: videoSource ? 'video' : 'gps',
        check_in_location_confirmed: false,
      };
      if (beforePhoto) update.before_photo = String(beforePhoto);

      // Geofence only for outdoor, GPS-based check-ins. Distance is measured to
      // the neighbor's geocoded home, which is the job address.
      let locationConfirmed = false;
      if (!isOnline && typeof lat === 'number' && typeof lng === 'number') {
        try {
          const buyers = await svc.BuyerProfile.filter({ user_id: booking.buyer_user_id });
          const bp = buyers[0];
          if (bp?.latitude != null && bp?.longitude != null) {
            const miles = haversineMiles(lat, lng, bp.latitude, bp.longitude);
            locationConfirmed = miles <= GEO_RADIUS_MILES;
            update.check_in_location_confirmed = locationConfirmed;
            update.check_in_lat = lat;
            update.check_in_lng = lng;
          }
        } catch (err) {
          console.error('checkIn geofence failed:', err?.message);
        }
      }
      if (videoSource) update.check_in_location_confirmed = true;

      await svc.Booking.update(booking.id, update);

      await alertParentCheckIn(base44, {
        parentUserId: booking.parent_user_id,
        teenName: booking.teen_display_name || 'Your teen',
        jobTitle: booking.listing_title || 'the job',
        buyerName: booking.buyer_name || '',
        at: now.toISOString(),
        locationConfirmed: !!update.check_in_location_confirmed,
        bookingId: booking.id,
      });

      return Response.json({
        ok: true,
        check_in_at: update.check_in_at,
        locationConfirmed: !!update.check_in_location_confirmed,
      });
    }

    // ── Check out ──
    if (!booking.check_in_at) {
      return Response.json({ error: 'Check in first.' }, { status: 400 });
    }
    if (booking.check_out_at) {
      return Response.json({ alreadyDone: true, check_out_at: booking.check_out_at });
    }

    const update: Record<string, unknown> = {
      check_out_at: now.toISOString(),
      check_out_location_confirmed: false,
    };
    let locationConfirmed = false;
    if (!isOnline && typeof lat === 'number' && typeof lng === 'number') {
      try {
        const buyers = await svc.BuyerProfile.filter({ user_id: booking.buyer_user_id });
        const bp = buyers[0];
        if (bp?.latitude != null && bp?.longitude != null) {
          const miles = haversineMiles(lat, lng, bp.latitude, bp.longitude);
          locationConfirmed = miles <= GEO_RADIUS_MILES;
          update.check_out_location_confirmed = locationConfirmed;
          update.check_out_lat = lat;
          update.check_out_lng = lng;
        }
      } catch (err) {
        console.error('checkOut geofence failed:', err?.message);
      }
    }
    if (videoSource) update.check_out_location_confirmed = true;

    await svc.Booking.update(booking.id, update);

    await alertParentCheckOut(base44, {
      parentUserId: booking.parent_user_id,
      teenName: booking.teen_display_name || 'Your teen',
      jobTitle: booking.listing_title || 'the job',
      at: now.toISOString(),
      locationConfirmed: !!update.check_out_location_confirmed,
      bookingId: booking.id,
    });

    return Response.json({
      ok: true,
      check_out_at: update.check_out_at,
      locationConfirmed: !!update.check_out_location_confirmed,
    });
  } catch (error) {
    console.error('checkIn error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});