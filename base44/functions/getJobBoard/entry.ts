import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns open job posts (with the physical address stripped) plus buyer
// rating aggregates, so the teen job board never pulls addresses or
// coordinates to the client. Mirrors how searchTeens protects teen private
// data — the client only gets what it needs to render, never raw PII.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const openJobs = await svc.JobPost.filter({ status: 'open' }, '-created_date', 50);

    // Fetch only the rating fields for each buyer — never the full profile
    // (which now contains address/latitude/longitude locked behind RLS).
    const buyerIds = [...new Set(openJobs.map((j) => j.buyer_user_id).filter(Boolean))];
    const buyerProfiles = await Promise.all(
      buyerIds.map((id) => svc.BuyerProfile.filter({ user_id: id }))
    );
    const ratings: Record<string, { avg: number; count: number }> = {};
    buyerProfiles.forEach((arr, i) => {
      const b = arr[0];
      if (b) ratings[buyerIds[i]] = { avg: b.avg_rating || 0, count: b.review_count || 0 };
    });

    // Strip the physical address from each job before sending to the client.
    // The address is revealed only after a booking is confirmed (via the
    // Booking entity, which has its own participant-scoped RLS).
    const jobs = openJobs.map((j) => {
      const { address, ...rest } = j;
      return rest;
    });

    return Response.json({ jobs, ratings });
  } catch (error) {
    console.error('getJobBoard error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});