import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';
import { emailFooter } from '../../shared/emailFooter.ts';

// Runs once a day (workflow: Payout Setup Reminders).
//
// When a teen taps Cash out and their parent has no payout account yet, the
// parent is told immediately (walletCashOut → notifyParentPayoutSetupNeeded,
// in-app + email). The money stays safely in the teen's wallet. If nobody acts,
// this job reminds the parent again after 3, 7 and 14 days — then stops, so it
// never becomes spam.
//
// The first notice is the anchor: one 'payout_setup_needed' notification per
// cash-out attempt. Reminders are counted per parent since that anchor, so each
// stage is sent exactly once.
const DAY = 24 * 60 * 60 * 1000;
const STAGES = [3, 7, 14];
const MAX_AGE_DAYS = 30;

Deno.serve(async (req) => {
  const denied = await verifyWorkflowCall(req);
  if (denied) return denied;
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const now = Date.now();

    const anchors = await svc.Notification.filter({ type: 'payout_setup_needed' }, '-created_date', 200);
    const fresh = anchors.filter((a) => {
      const age = now - new Date(a.created_date).getTime();
      return age >= 0 && age <= MAX_AGE_DAYS * DAY;
    });

    let sent = 0;
    const seen = new Set<string>();

    for (const anchor of fresh) {
      const parentUserId = anchor.user_id;
      if (!parentUserId || seen.has(parentUserId)) continue;
      seen.add(parentUserId);

      // Already set up? Then there is nothing to remind about.
      const profiles = await svc.ParentProfile.filter({ user_id: parentUserId });
      if (profiles[0]?.connect_status === 'active') continue;

      const daysSince = Math.floor((now - new Date(anchor.created_date).getTime()) / DAY);
      const dueIndex = STAGES.filter((d) => daysSince >= d).length;
      if (dueIndex === 0) continue;

      const reminders = await svc.Notification.filter({ user_id: parentUserId, type: 'payout_setup_reminder' }, '-created_date', 10);
      const sentSinceAnchor = reminders.filter(
        (r) => new Date(r.created_date).getTime() >= new Date(anchor.created_date).getTime(),
      ).length;
      if (sentSinceAnchor >= dueIndex) continue;

      const links = await svc.ParentTeenLink.filter({ parent_user_id: parentUserId, status: 'confirmed' });
      const teenName = links[0]?.teen_display_name || 'Your teen';
      const link = '/parent/payouts';

      await svc.Notification.create({
        user_id: parentUserId,
        type: 'payout_setup_reminder',
        title: `${teenName} is still waiting to cash out`,
        body: `Set up your payout account so ${teenName} can get paid. The money is safely held in their Blockwork Wallet until then.`,
        link,
        read: false,
      });

      const parents = await svc.User.filter({ id: parentUserId });
      const parent = parents[0];
      if (parent?.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: parent.email,
            subject: `Reminder: ${teenName} is waiting to cash out`,
            body:
              `Hi ${parent.full_name || ''},\n\n` +
              `${teenName} asked to cash out their Blockwork earnings, but payouts aren't set up yet, so the money is ` +
              `still held safely in their wallet.\n\n` +
              `Payouts go to your account, so only you can set this up. It takes a few minutes: ` +
              `${APP_BASE_URL}${link}${emailFooter(APP_BASE_URL)}`,
          });
          sent++;
        } catch (err: any) {
          console.error('payoutSetupReminders email error:', err?.message);
        }
      }
    }

    return Response.json({ ok: true, anchors: fresh.length, reminded: sent });
  } catch (error: any) {
    console.error('payoutSetupReminders failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});