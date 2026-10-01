import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geocodeAddress } from '../../shared/geocode.ts';
import { validateZip } from '../../shared/accountValidation.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { emailFooter } from '../../shared/emailFooter.ts';

// "Change job address" on a booking.
//
// A booking keeps its own copy of the address it was booked at, so editing a
// saved address never moves a booked job — this is the only way to move one.
// For a teen under 18 the address is a safety decision, so a change to a
// confirmed job goes back to the parent to approve again. If the parent
// declines, the existing deny path refunds the neighbor automatically.

const CHANGEABLE = ['pending_parent_approval', 'confirmed'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { booking_id, address, zip } = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const ip = getClientIp(req);
    const origin = getSafeOrigin(req);

    const cleanZip = validateZip(zip);
    if (!cleanZip.ok) return Response.json({ error: cleanZip.error }, { status: 400 });
    const street = String(address || '').trim();
    if (street.length < 5 || street.length > 200) {
      return Response.json({ error: 'Enter the new street address.' }, { status: 400 });
    }

    const booking = await svc.Booking.get(String(booking_id || ''));
    if (!booking) return Response.json({ error: 'Booking not found.' }, { status: 404 });
    const isAdmin = String(user.role || '') === 'admin';
    if (booking.buyer_user_id !== user.id && !isAdmin) {
      return Response.json({ error: 'This booking isn\'t yours.' }, { status: 403 });
    }
    if (!CHANGEABLE.includes(booking.status)) {
      return Response.json({
        error: booking.status === 'in_progress' || booking.status === 'completed'
          ? 'This job has already started, so its address can\'t be changed. Message the teen instead.'
          : 'This booking can\'t have its address changed.',
      }, { status: 400 });
    }

    let geo;
    try {
      geo = await geocodeAddress(`${street}, ${cleanZip.value}, CA`);
    } catch (err: any) {
      return Response.json({ error: err?.message || 'We couldn\'t verify that address. Please check it and try again.' }, { status: 400 });
    }
    if (String(geo.state || '').toUpperCase() !== 'CA') {
      return Response.json({
        error: `Blockwork only works in California right now — that address is in ${geo.state || 'another state'}.`,
      }, { status: 403 });
    }

    const previous = booking.address || '';
    const links = await svc.ParentTeenLink.filter({ teen_user_id: booking.teen_user_id, status: 'confirmed' });
    const parentUserId = links[0]?.parent_user_id || booking.parent_user_id || '';
    const isMinor = !!links[0];

    const needsParentApproval = isMinor && booking.status === 'confirmed';
    const patch: Record<string, unknown> = { address: street };
    if (needsParentApproval) {
      // Back to the parent. The neighbor's payment stays held where it is.
      patch.status = 'pending_parent_approval';
    }
    await svc.Booking.update(booking.id, patch);

    await writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: isAdmin ? 'admin' : 'buyer',
      action: 'booking_address_changed', category: 'security',
      target_type: 'Booking', target_id: booking.id,
      summary: `Job address changed from "${previous}" to "${street}"`,
      metadata: { before: previous, after: street, city: geo.city, state: geo.state, reapproval_required: needsParentApproval },
      ip,
    });

    const who = user.full_name || booking.buyer_name || 'The neighbor';

    if (parentUserId) {
      const parents = await svc.User.filter({ id: parentUserId });
      const parent = parents[0];
      await svc.Notification.create({
        user_id: parentUserId,
        type: 'approval',
        title: needsParentApproval ? 'Job address changed — approve again' : 'Job address updated',
        body: `${who} moved "${booking.listing_title}" to ${street}, ${geo.city}. ${needsParentApproval ? 'Please review the new location and approve.' : ''}`.trim(),
        link: `/parent/approvals?item=${booking.id}`,
        read: false,
      });
      if (parent?.email) {
        const deepLink = `${origin}/parent/approvals?item=${booking.id}`;
        const body = needsParentApproval
          ? `Hi ${parent.full_name || ''},\n\n${who} changed the address of "${booking.listing_title}" for ${booking.teen_display_name || 'your teen'} to:\n${street}, ${geo.city}, ${geo.state}\n\nBecause the job now happens at a new place, it's waiting for your approval again. Nothing is confirmed until you approve it. If you don't approve, the neighbor is refunded automatically.\n\nReview it here: ${deepLink}${emailFooter(origin)}`
          : `Hi ${parent.full_name || ''},\n\nThe address of "${booking.listing_title}" for ${booking.teen_display_name || 'your teen'} was changed to:\n${street}, ${geo.city}, ${geo.state}\n\nIt's already approved — this is just so you know where the job is.\n\nSee the job: ${deepLink}${emailFooter(origin)}`;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: parent.email,
            subject: needsParentApproval
              ? `Address changed — approve "${booking.listing_title}" again`
              : `Address updated for "${booking.listing_title}"`,
            body,
          });
        } catch (err: any) {
          console.error('changeJobAddress parent email failed:', err?.message);
        }
      }
    }

    await svc.Notification.create({
      user_id: booking.teen_user_id,
      type: 'booking',
      title: 'Job address updated',
      body: `"${booking.listing_title}" is now at ${street}, ${geo.city}.`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    return Response.json({ ok: true, needs_parent_approval: needsParentApproval, city: geo.city, state: geo.state });
  } catch (error: any) {
    console.error('changeJobAddress error:', error?.message || error);
    return Response.json({ error: 'Could not change that address. Please try again.' }, { status: 500 });
  }
});