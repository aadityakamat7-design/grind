// Sends an email notification to a parent when a payout is transferred to
// their connected bank account.
export async function notifyParentPayoutSent(base44, opts) {
  const { parentUserId, amount, jobTitle, bankLast4 } = opts;
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
        `View your payout history: ${opts.origin || ''}/parent/payouts\n\n` +
        `— The KickStart team`,
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
        `Before you can approve this job, you need to complete two quick steps for safety and so ${teenName} can receive earnings:\n\n` +
        `1. Verify your identity (government ID — takes about a minute)\n` +
        `2. Connect your bank account for payouts (directly with Stripe)\n\n` +
        `The booking is safely waiting — it won't be approved or cancelled until you're ready.\n\n` +
        `Complete setup here: ${deepLink}\n\n` +
        `— The KickStart team`
      : `Hi ${parent.full_name || ''},\n\n${teenName} accepted "${jobTitle}" from ${buyerName}. ` +
        `The booking is waiting for your approval.\n\n` +
        `Review and approve it here: ${deepLink}\n\n` +
        `— The KickStart team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject,
      body,
    });
  } catch (err) {
    console.error('notifyParentJobAccepted error:', err.message);
  }
}