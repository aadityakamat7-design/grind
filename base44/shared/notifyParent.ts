import { emailFooter } from './emailFooter.ts';
import { APP_BASE_URL } from './safeOrigin.ts';

// Sends an email notification to a parent when a payout is transferred to
// their connected bank account.
export async function notifyParentPayoutSent(base44, opts) {
  const { parentUserId, amount, jobTitle, bankLast4, origin } = opts;
  try {
    const parents = await base44.asServiceRole.entities.User.filter({ id: parentUserId });
    const parent = parents[0];
    if (!parent?.email) return;
    const money = (n) => `$${Number(n || 0).toFixed(2)}`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject: `Payout on its way to your bank — ${money(amount)}`,
      body: `Hi ${parent.full_name || ''},\n\n` +
        `${money(amount)} from "${jobTitle}" was transferred to your bank account${bankLast4 ? ` ending in ${bankLast4}` : ''}. ` +
        `It typically arrives in 1–2 business days.\n\n` +
        `View your payout history: ${origin || ''}/parent/payouts${emailFooter(origin)}`,
    });
  } catch (err) {
    console.error('notifyParentPayoutSent error:', err.message);
  }
}

// Sends an email notification to a parent when their teen accepts a job.
// Uses the built-in SendEmail integration (reaches registered app users).
// SMS via Twilio is skipped — no credentials configured.
//
// base44: the service-role client (from createClientFromRequest)
// opts: { teenName, jobTitle, buyerName, parentUserId, origin, setupNeeded }
export async function notifyParentJobAccepted(base44, opts) {
  const { teenName, jobTitle, buyerName, parentUserId, origin, setupNeeded } = opts;
  try {
    const parents = await base44.asServiceRole.entities.User.filter({ id: parentUserId });
    const parent = parents[0];
    if (!parent?.email) return;

    const deepLink = setupNeeded
      ? `${origin}/parent/approvals?setup=1`
      : `${origin}/parent/approvals`;

    const subject = setupNeeded
      ? `${teenName} accepted a job — complete setup to approve`
      : `${teenName} accepted a job — review and approve`;

    const body = setupNeeded
      ? `Hi ${parent.full_name || ''},\n\n${teenName} accepted "${jobTitle}" from ${buyerName}. ` +
        `Before you can approve this job, you need to complete one quick step for safety and so ${teenName} can receive earnings:\n\n` +
        `1. Set up your payout account through Stripe (legal name, date of birth, SSN, and bank account — takes a few minutes)\n\n` +
        `The booking is safely waiting — it won't be approved or cancelled until you're ready.\n\n` +
        `Complete setup here: ${deepLink}${emailFooter(origin)}`
      : `Hi ${parent.full_name || ''},\n\n${teenName} accepted "${jobTitle}" from ${buyerName}. ` +
        `The booking is waiting for your approval.\n\n` +
        `Review and approve it here: ${deepLink}${emailFooter(origin)}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject,
      body,
    });
  } catch (err) {
    console.error('notifyParentJobAccepted error:', err.message);
  }
}

// Sends an email notification to a parent when a neighbor books their teen
// and the booking is waiting for the parent's approval. Mirrors the in-app
// Notification created in createBooking — email ensures the parent sees it
// even if they don't have the app open.
export async function notifyParentApprovalNeeded(base44, opts) {
  const { teenName, jobTitle, buyerName, parentUserId, origin } = opts;
  // origin is used in emailFooter below
  try {
    const parents = await base44.asServiceRole.entities.User.filter({ id: parentUserId });
    const parent = parents[0];
    if (!parent?.email) return;
    const deepLink = `${origin || ''}/parent/approvals`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject: `Approval needed: ${buyerName} booked ${teenName}`,
      body:
        `Hi ${parent.full_name || ''},\n\n` +
        `${buyerName} booked "${jobTitle}" with ${teenName}. ` +
        `The booking is waiting for your approval before it's confirmed.\n\n` +
        `Review and approve it here: ${deepLink}${emailFooter(origin)}`,
    });
  } catch (err) {
    console.error('notifyParentApprovalNeeded error:', err.message);
  }
}

// A teen tried to cash out and the parent's payout account isn't set up yet.
// The parent gets an in-app notification plus an email with a link that starts
// Stripe payout setup — payouts go to their account, so only they can unblock it.
export async function notifyParentPayoutSetupNeeded(base44, opts) {
  const { parentUserId, teenName, amount } = opts;
  try {
    const parents = await base44.asServiceRole.entities.User.filter({ id: parentUserId });
    const parent = parents[0];
    const money = `$${Number(amount || 0).toFixed(2)}`;

    await base44.asServiceRole.entities.Notification.create({
      user_id: parentUserId,
      type: 'payment',
      title: `${teenName} wants to cash out`,
      body: `${money} is waiting in ${teenName}'s wallet. Set up your payout account so they can get paid.`,
      link: '/parent/payouts',
      read: false,
    });

    if (!parent?.email) return;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject: `${teenName} is waiting to cash out — set up payouts`,
      body: `Hi ${parent.full_name || ''},\n\n` +
        `${teenName} tried to cash out ${money} from their Blockwork Wallet, but payouts aren't set up yet, ` +
        `so the money is still held safely in their wallet.\n\n` +
        `Payouts go to your account, so only you can set this up. Stripe verifies your legal name, date of birth, ` +
        `the last 4 of your SSN, and your bank account — it takes a few minutes.\n\n` +
        `Set it up here: ${APP_BASE_URL}/parent/payouts${emailFooter(APP_BASE_URL)}`,
    });
  } catch (err) {
    console.error('notifyParentPayoutSetupNeeded error:', err.message);
  }
}