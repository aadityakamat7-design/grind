import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';
import { alertParentSOS, alertParentSafeNow } from '../../shared/parentAlerts.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';

// The teen's SOS button during an active job.
//
// 911 is NEVER called automatically — the screen shows a big "Call 911" button
// and the teen decides. This function alerts the parent (in-app + email with
// location, job, address and the neighbor's name), alerts admins, and files an
// urgent report in the safety queue.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, action, lat, lng } = await req.json();
    if (!bookingId || !['sos', 'safe'].includes(action)) {
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
    if (user.id !== booking.teen_user_id) {
      return Response.json({ error: 'Only the teen on this job can use SOS.' }, { status: 403 });
    }

    // ── I'm safe now ──
    if (action === 'safe') {
      await svc.Booking.update(booking.id, { sos_resolved_at: new Date().toISOString() });
      await alertParentSafeNow(base44, {
        parentUserId: booking.parent_user_id,
        teenName: booking.teen_display_name || 'Your teen',
        bookingId: booking.id,
      });
      await notifyAdmins(base44, {
        type: 'safety',
        title: `${booking.teen_display_name || 'A teen'} says they're safe`,
        body: `The SOS on "${booking.listing_title}" was marked resolved by the teen.`,
        link: `/bookings/${booking.id}`,
      });
      return Response.json({ ok: true, resolved: true });
    }

    // ── SOS ──
    // The button is only live while the teen is on the job, between check-in
    // and check-out.
    if (booking.status !== 'in_progress' && !(booking.check_in_at && !booking.check_out_at)) {
      return Response.json({ error: 'SOS is available while a job is in progress.' }, { status: 400 });
    }

    const at = new Date().toISOString();
    const update: Record<string, unknown> = { sos_at: at, sos_resolved_at: null };
    if (typeof lat === 'number' && typeof lng === 'number') {
      update.sos_lat = lat;
      update.sos_lng = lng;
    }
    await svc.Booking.update(booking.id, update);

    await alertParentSOS(base44, {
      parentUserId: booking.parent_user_id,
      teenName: booking.teen_display_name || 'Your teen',
      jobTitle: booking.listing_title || 'the job',
      buyerName: booking.buyer_name || '',
      address: booking.address || '',
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      bookingId: booking.id,
    });

    await notifyAdmins(base44, {
      type: 'safety',
      title: `SOS — ${booking.teen_display_name || 'a teen'} needs help`,
      body: `SOS pressed during "${booking.listing_title}"${booking.buyer_name ? ` at ${booking.buyer_name}'s` : ''}${booking.address ? ` (${booking.address})` : ''}. The parent has been alerted by app and email.`,
      link: `/bookings/${booking.id}`,
    });

    // Urgent report so it lands at the top of the admin safety queue.
    await svc.Report.create({
      reporter_id: user.id,
      reporter_name: booking.teen_display_name || 'Teen',
      subject_id: booking.buyer_user_id || '',
      subject_name: booking.buyer_name || '',
      booking_id: booking.id,
      reason: 'safety',
      details:
        `SOS pressed during "${booking.listing_title}" at ${new Date(at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}. ` +
        `Neighbor: ${booking.buyer_name || 'unknown'}. Address: ${booking.address || 'not provided'}.` +
        (typeof lat === 'number' && typeof lng === 'number' ? ` Location: https://maps.google.com/?q=${lat},${lng}` : ''),
      severity: 'urgent',
      auto_flagged: true,
      status: 'open',
    });

    await writeAuditLog(base44, {
      actor_user_id: user.id,
      actor_role: 'teen',
      action: 'sos_triggered',
      category: 'security',
      target_type: 'Booking',
      target_id: booking.id,
      summary: `SOS pressed during "${booking.listing_title}"`,
      metadata: { buyer_user_id: booking.buyer_user_id, has_location: typeof lat === 'number' },
    });

    return Response.json({ ok: true, sos_at: at });
  } catch (error) {
    console.error('triggerSOS error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});