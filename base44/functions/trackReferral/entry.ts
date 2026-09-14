import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Records a referral when a new user completes onboarding after signing up
// via someone's invite link. The referrer's user id was captured client-side
// from the ?ref= URL param and stored in localStorage; the onboarding page
// invokes this function once the user is fully onboarded.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { referrerId, referredEmail } = await req.json();
    if (!referrerId) return Response.json({ error: 'referrerId required' }, { status: 400 });

    // Don't record self-referrals.
    if (referrerId === user.id) return Response.json({ skipped: true, reason: 'self_referral' });

    const svc = base44.asServiceRole.entities;

    // Check for an existing record to avoid duplicates.
    const existing = await svc.Referral.filter({ referrer_id: referrerId, referred_user_id: user.id });
    if (existing.length > 0) return Response.json({ skipped: true, reason: 'already_tracked' });

    // Look up the referrer's profile for their name + role.
    const [teenProfiles, buyerProfiles, parentProfiles] = await Promise.all([
      svc.TeenProfile.filter({ user_id: referrerId }),
      svc.BuyerProfile.filter({ user_id: referrerId }),
      svc.ParentProfile.filter({ user_id: referrerId }),
    ]);

    let referrerName = '';
    let referrerRole = '';
    if (teenProfiles[0]) { referrerName = teenProfiles[0].display_name || ''; referrerRole = 'teen'; }
    else if (buyerProfiles[0]) { referrerName = buyerProfiles[0].full_name || ''; referrerRole = 'buyer'; }
    else if (parentProfiles[0]) { referrerName = parentProfiles[0].full_name || ''; referrerRole = 'parent'; }

    await svc.Referral.create({
      referrer_id: referrerId,
      referrer_role: referrerRole,
      referrer_name: referrerName,
      referred_user_id: user.id,
      referred_email: referredEmail || user.email || '',
      referred_role: user.app_role || '',
      status: 'signed_up',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackReferral error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}