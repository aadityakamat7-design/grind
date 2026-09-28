import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { recordTermsAcceptance, TERMS_VERSION } from '../../shared/termsAcceptance.ts';

// Records the current user's acceptance of the current Terms of Service.
// Called by the frontend TermsAcceptanceGate when the user checks the box
// and clicks "I agree". Saves the version, timestamp, IP, and user agent
// in a ConsentRecord. For parents, also records acceptance on behalf of
// each linked teen.
//
// Teens under 18 cannot call this — they must have their parent accept.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accepted, userAgent } = await req.json();
    if (accepted !== true) {
      return Response.json({ error: 'You must check the box to accept the Terms.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;

    // Reject teens under 18 — they can't accept for themselves
    const teenProfiles = await svc.TeenProfile.filter({ user_id: user.id });
    const teenProfile = teenProfiles[0];
    if (teenProfile) {
      const links = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
      if (links.length > 0) {
        return Response.json({
          error: 'Your parent or guardian needs to accept the updated Terms for you. Please ask them to sign in to Blockwork and accept.',
        }, { status: 403 });
      }
    }

    // Determine if this user is a parent (has confirmed parent-teen links)
    const parentLinks = await svc.ParentTeenLink.filter({ parent_user_id: user.id, status: 'confirmed' });
    const isParent = parentLinks.length > 0;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown';

    await recordTermsAcceptance(svc, base44, {
      userId: user.id,
      ip,
      userAgent: userAgent || '',
      isParent,
    });

    return Response.json({ accepted: true, termsVersion: TERMS_VERSION });
  } catch (error) {
    console.error('acceptTerms error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});