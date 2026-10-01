import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// A parent approves or declines a service their teen posted. Until it is
// approved the service stays hidden from neighbors ('draft'), so a minor can
// never put work in front of the marketplace without their parent's OK.
//
// Approval is only accepted from the parent who is actually linked to this
// teen, in their own signed-in session — never from a client-supplied id.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { listingId, approve, reason } = await req.json();
    if (!listingId) return Response.json({ error: 'listingId required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const listing = await svc.Listing.get(listingId).catch(() => null);
    if (!listing) return Response.json({ error: 'Service not found' }, { status: 404 });

    // The caller must be the teen's confirmed linked parent.
    const links = await svc.ParentTeenLink.filter({
      parent_user_id: user.id,
      teen_user_id: listing.teen_user_id,
      status: 'confirmed',
    });
    if (!links[0]) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if ((listing.parent_approval_status || 'approved') !== 'pending') {
      return Response.json({ error: 'This service is not waiting for approval.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const teenName = listing.teen_display_name || 'Your teen';

    if (approve) {
      await svc.Listing.update(listing.id, {
        status: 'published',
        parent_approval_status: 'approved',
        parent_approval_at: nowIso,
        parent_rejection_reason: '',
      });
      await svc.Notification.create({
        user_id: listing.teen_user_id,
        type: 'approval',
        title: 'Service approved 🎉',
        body: `Your parent approved "${listing.title}". Neighbors can book it now.`,
        link: '/teen/listings',
        read: false,
      });
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: user.app_role || 'parent', action: 'listing_approved',
        category: 'approval', target_type: 'Listing', target_id: listing.id,
        summary: `Approved service "${listing.title}" for ${teenName}`,
        metadata: { price: listing.price, category: listing.category, teen_user_id: listing.teen_user_id },
        ip: getClientIp(req),
      });
    } else {
      const trimmed = (reason || '').trim().slice(0, 500);
      await svc.Listing.update(listing.id, {
        status: 'draft',
        parent_approval_status: 'rejected',
        parent_rejection_reason: trimmed,
      });
      await svc.Notification.create({
        user_id: listing.teen_user_id,
        type: 'approval',
        title: 'Service not approved',
        body: `Your parent didn't approve "${listing.title}".${trimmed ? ` They said: ${trimmed}` : ''} You can edit it and send it again.`,
        link: '/teen/listings',
        read: false,
      });
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: user.app_role || 'parent', action: 'listing_rejected',
        category: 'approval', target_type: 'Listing', target_id: listing.id,
        summary: `Declined service "${listing.title}" for ${teenName}`,
        metadata: { reason: trimmed, teen_user_id: listing.teen_user_id },
        ip: getClientIp(req),
      });
    }

    return Response.json({ success: true, approved: !!approve });
  } catch (error) {
    console.error('decideListing error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});