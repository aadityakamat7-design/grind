import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { hasAcceptedCurrentTerms } from '../../shared/termsAcceptance.ts';

// Checks whether the current user has accepted the current Terms of Service
// version. Called by the frontend TermsAcceptanceGate on app load to decide
// whether to show the re-acceptance modal. Returns:
//   { needsAcceptance: boolean, isTeen: boolean, canAccept: boolean }
//
// Teens under 18 cannot accept for themselves — their parent must accept.
// canAccept is false for teens, and the gate shows a "ask your parent" message.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const accepted = await hasAcceptedCurrentTerms(svc, user.id);

    // Determine if this user is a teen (under 18) who can't accept for themselves.
    // A teen has a TeenProfile with status 'active' or 'pending_parent' and is
    // linked to a parent. Independent teens (18+) have connect_status set up
    // and don't need a parent — they can accept for themselves.
    let isTeen = false;
    let canAccept = true;

    const teenProfiles = await svc.TeenProfile.filter({ user_id: user.id });
    const teenProfile = teenProfiles[0];
    if (teenProfile) {
      // Check if this is an independent teen (18+) or a minor teen.
      // Independent teens have their own Stripe Connect account; minor teens
      // route through their parent. We check the parent_teen_link — if a
      // confirmed link exists, this is a minor teen whose parent accepts for them.
      const links = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
      if (links.length > 0) {
        // Minor teen with a confirmed parent — parent accepts on their behalf
        isTeen = true;
        canAccept = false;
      }
    }

    return Response.json({
      needsAcceptance: !accepted,
      isTeen,
      canAccept,
      termsVersion: '2026-10-01',
    });
  } catch (error) {
    console.error('checkTermsAcceptance error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});