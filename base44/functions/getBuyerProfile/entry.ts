import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns a buyer's public profile data. BuyerProfile RLS restricts reads
// to owner+admin, so this function is the only way for a teen to see a
// neighbor's reputation before accepting a job. Sensitive fields (address,
// zip, coordinates) are never exposed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { user_id } = await req.json();
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const profiles = await svc.BuyerProfile.filter({ user_id });
    if (!profiles[0]) return Response.json({ error: 'Profile not found' }, { status: 404 });

    const p = profiles[0];
    return Response.json({
      profile: {
        user_id: p.user_id,
        full_name: p.full_name?.split(' ')[0] || 'Neighbor',
        avg_rating: p.avg_rating || 0,
        review_count: p.review_count || 0,
        jobs_completed: p.jobs_completed || 0,
        resolved_city: p.resolved_city || '',
      },
    });
  } catch (error) {
    console.error('getBuyerProfile error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});