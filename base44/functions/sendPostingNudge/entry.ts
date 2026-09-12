import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';

// Weekly engagement nudge: emails neighbors (BuyerProfile owners) who have
// never posted a job, encouraging them to post their first one. Runs on a
// schedule via the Posting Nudge workflow. Once a neighbor posts a job they
// stop receiving this nudge (they'll have a JobPost with their buyer_user_id).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

    // Gather every buyer profile and every job post, then nudge only the
    // buyers who have never posted. Two queries total — no per-user loops.
    const [profiles, posts] = await Promise.all([
      svc.BuyerProfile.list('-created_date', 500),
      svc.JobPost.list('-created_date', 500),
    ]);
    const postedUserIds = new Set(
      (posts || []).map((p) => p.buyer_user_id).filter(Boolean)
    );

    const origin = APP_BASE_URL;
    const jobLink = `${origin}/jobs`;
    let sent = 0;
    let skipped = 0;

    for (const profile of profiles || []) {
      if (!profile.user_id) continue;
      if (postedUserIds.has(profile.user_id)) { skipped++; continue; }
      // Cap per run to avoid a runaway blast.
      if (sent >= 100) break;

      try {
        const users = await svc.User.filter({ id: profile.user_id });
        const u = users?.[0];
        if (!u?.email) continue;

        const firstName = (u.full_name || 'there').split(' ')[0];
        const subject = `Got a job that needs doing? Local teens are ready`;
        const textBody =
          `Hi ${firstName},\n\n` +
          `Need a hand with lawn care, tutoring, pet sitting, or odd jobs around the house? ` +
          `Post a job on Blockwork and a verified local teen will claim it.\n\n` +
          `How it works:\n` +
          `1. Post your job — describe it, set your price, and pay upfront.\n` +
          `2. A local teen claims it and gets it done.\n` +
          `3. Your payment stays held safely in escrow until you confirm the work is finished.\n\n` +
          `Post your first job here: ${jobLink}\n\n` +
          `— The Blockwork team`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject,
          body: textBody,
        });
        sent++;
      } catch (err) {
        // Stale/seed profile user_ids or a failed send shouldn't abort the run.
        console.error('sendPostingNudge skip:', err.message);
      }
    }

    return Response.json({ sent, skipped, considered: (profiles || []).length });
  } catch (error) {
    console.error('sendPostingNudge error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});