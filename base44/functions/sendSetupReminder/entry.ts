import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';

// Called by the Setup Reminders workflow at 24h and 72h after a teen accepts
// their first job. Checks whether the parent's payout setup is still incomplete
// and the booking is still pending. If so, sends a reminder email. Stops
// (returns done: true) once setup is complete or the booking is resolved.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;
    const { bookingId } = body;
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ done: true, reason: 'booking_not_found' });
    if (booking.status !== 'pending_parent_approval') {
      return Response.json({ done: true, reason: 'booking_resolved' });
    }

    const parentProfiles = booking.parent_user_id
      ? await svc.ParentProfile.filter({ user_id: booking.parent_user_id })
      : [];
    const pp = parentProfiles[0];
    const setupComplete = pp?.is_identity_verified && pp?.connect_status === 'active';
    if (setupComplete) {
      return Response.json({ done: true, reason: 'setup_complete' });
    }

    // Send reminder email to the parent
    const parents = booking.parent_user_id
      ? await svc.User.filter({ id: booking.parent_user_id })
      : [];
    const parent = parents[0];
    if (parent?.email) {
      const origin = getSafeOrigin(req);
      const deepLink = `${origin}/parent/approvals?setup=1`;
      const teenName = booking.teen_display_name || 'Your teen';
      const subject = `Reminder: ${teenName}'s job is waiting — complete setup to approve`;
      const body =
        `Hi ${parent.full_name || ''},\n\n` +
        `This is a friendly reminder: ${teenName} accepted "${booking.listing_title}" and it's still waiting for your approval.\n\n` +
        `To approve this job, complete your identity verification and connect your bank account:\n${deepLink}\n\n` +
        `The booking is safely waiting — it won't be approved or cancelled until you're ready.\n\n` +
        `— The KickStart team`;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: parent.email,
          subject,
          body,
        });
      } catch (err) {
        console.error('sendSetupReminder email error:', err.message);
      }
    }

    return Response.json({ sent: true });
  } catch (error) {
    console.error('sendSetupReminder error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});