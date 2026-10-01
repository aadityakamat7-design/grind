import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveTermsReacceptance } from '../../shared/termsAcceptance.ts';

// Server-side decision: does this user need the "Updated Terms" pop-up?
// Called by the frontend on app load — the browser never decides this.
//
// Returns:
//   needsTermsReacceptance — true only when the user has an acceptance on record
//                            that is OLDER than the current version, and they're
//                            a parent, neighbor, or 18+ user. Brand-new users,
//                            users whose acceptance was never recorded, and
//                            teens under 18 always get false.
//   teenNotice             — a teen under 18 whose parent's acceptance is an
//                            older version: show a small notice, never block.
//   canAccept              — false for teens under 18 (their parent accepts).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const decision = await resolveTermsReacceptance(base44.asServiceRole.entities, user);
    return Response.json(decision);
  } catch (error) {
    console.error('checkTermsAcceptance error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});