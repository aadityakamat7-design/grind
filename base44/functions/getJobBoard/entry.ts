import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';

// Returns open job posts (with the physical address stripped) plus buyer
// rating aggregates, so the teen job board never pulls addresses or
// coordinates to the client. Mirrors how searchTeens protects teen private
// data — the client only gets what it needs to render, never raw PII.
// Also returns per-job category eligibility for the requesting teen so the
// UI can mark ineligible jobs without the client computing age rules.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const openJobs = await svc.JobPost.filter({ status: 'open' }, '-created_date', 50);

    // Fetch the teen's verified age so we can compute per-job eligibility
    // server-side. The age itself is never sent to the client.
    const [teenPrivateRecs] = await Promise.all([
      svc.TeenPrivateData.filter({ user_id: user.id }),
    ]);
    const teenAge = getVerifiedAge(teenPrivateRecs[0]);

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
    // Add category_min_age and eligible_for_user so the UI can mark ineligible
    // jobs. The teen's exact age is never sent to the client.
    const jobs = openJobs.map((j) => {
      const { address, ...rest } = j;
      const categoryMinAge = getMinAgeForCategory(j.state, j.category);
      const eligible = teenAge == null ? true : teenAge >= categoryMinAge;
      return {
        ...rest,
        category_min_age: categoryMinAge,
        eligible_for_user: eligible,
        ineligible_reason: eligible ? null : `Requires age ${categoryMinAge}+ in ${j.state}`,
      };
    });

    return Response.json({ jobs, ratings });
  } catch (error) {
    console.error('getJobBoard error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});