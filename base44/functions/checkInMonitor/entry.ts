import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { alertParentMissedCheckIn, alertParentOverdueCheckOut } from '../../shared/parentAlerts.ts';

// Runs every 15 minutes (workflow: CheckInMonitor).
//
//   1. No check-in 15 minutes after the start time → remind the teen, alert the parent.
//   2. No check-out 30 minutes after the scheduled end → alert the parent.
//   3. Deletes saved check-in / check-out / SOS locations 90 days after the job.
//
// Each alert fires once per booking (the *_alerted_at fields are the guard), so
// a booking is never spammed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const now = Date.now();
    const LOOKBACK_MS = 3 * 24 * 3600000;

    const bookings = await svc.Booking.filter(
      { status: { $in: ['confirmed', 'in_progress'] } },
      '-scheduled_start',
      200,
    );

    let missedAlerts = 0;
    let overdueAlerts = 0;

    for (const b of bookings) {
      if (!b.scheduled_start) continue;
      const start = new Date(b.scheduled_start).getTime();
      if (isNaN(start)) continue;
      if (start < now - LOOKBACK_MS || start > now + LOOKBACK_MS) continue;

      const hours = Number(b.estimated_hours) || 2;
      const end = start + hours * 3600000;

      // 1 — missed check-in
      if (!b.check_in_at && now > start + 15 * 60000 && !b.missed_checkin_alerted_at) {
        await svc.Booking.update(b.id, { missed_checkin_alerted_at: new Date().toISOString() });
        missedAlerts++;
        await svc.Notification.create({
          user_id: b.teen_user_id,
          type: 'safety',
          title: "Don't forget to check in",
          body: `Tap "I'm here" on "${b.listing_title}" so your parent knows you arrived safely.`,
          link: `/bookings/${b.id}`,
          read: false,
        });
        await alertParentMissedCheckIn(base44, {
          parentUserId: b.parent_user_id,
          teenName: b.teen_display_name || 'Your teen',
          jobTitle: b.listing_title || 'the job',
          buyerName: b.buyer_name || '',
          bookingId: b.id,
        });
        continue;
      }

      // 2 — overdue check-out
      if (b.check_in_at && !b.check_out_at && now > end + 30 * 60000 && !b.overdue_checkout_alerted_at) {
        await svc.Booking.update(b.id, { overdue_checkout_alerted_at: new Date().toISOString() });
        overdueAlerts++;
        await svc.Notification.create({
          user_id: b.teen_user_id,
          type: 'safety',
          title: 'Mark the job done when you head home',
          body: `Tap "Done, heading home" on "${b.listing_title}" so your parent knows you're on your way.`,
          link: `/bookings/${b.id}`,
          read: false,
        });
        await alertParentOverdueCheckOut(base44, {
          parentUserId: b.parent_user_id,
          teenName: b.teen_display_name || 'Your teen',
          jobTitle: b.listing_title || 'the job',
          bookingId: b.id,
        });
      }
    }

    // 3 — location retention: saved locations are deleted 90 days after the job.
    // Only the once-per-job check-in / check-out / SOS points are stored, and
    // they never outlive this window.
    const cutoff = new Date(now - 90 * 86400000).toISOString();
    const purgeFilter = { scheduled_start: { $lt: cutoff }, check_in_lat: { $exists: true } };
    const purgeResult = await svc.Booking.updateMany(purgeFilter, {
      $unset: {
        check_in_lat: 1,
        check_in_lng: 1,
        check_out_lat: 1,
        check_out_lng: 1,
        sos_lat: 1,
        sos_lng: 1,
      },
    });

    const purgeSos = await svc.Booking.updateMany(
      { scheduled_start: { $lt: cutoff }, sos_lat: { $exists: true } },
      { $unset: { sos_lat: 1, sos_lng: 1 } },
    );

    console.log(`checkInMonitor: ${missedAlerts} missed check-ins, ${overdueAlerts} overdue check-outs, ${purgeResult?.updated || 0} / ${purgeSos?.updated || 0} locations purged`);

    return Response.json({
      ok: true,
      missedAlerts,
      overdueAlerts,
      locationsPurged: (purgeResult?.updated || 0) + (purgeSos?.updated || 0),
    });
  } catch (error) {
    console.error('checkInMonitor error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});