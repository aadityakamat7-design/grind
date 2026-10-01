import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isAccountSuspended, suspendedError } from '../../shared/accountStatus.ts';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';
import { alertParentFlaggedMessage } from '../../shared/parentAlerts.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { screenMessage, senderNotice } from '../../shared/messageSafety.ts';

// The ONLY way to create a Message. Every message is screened before delivery:
// rules (free) → OpenAI moderation (free, when the key is set) → LLM review
// (paid, only when the first two disagree or land in the grey zone).
//
//   low    → the contact info is masked, the rest is delivered
//   medium → held (the recipient isn't a participant yet, so RLS hides it)
//   high   → blocked, urgent report, parent + admins alerted
//
// Senders are never told which rule matched. The Message entity's create RLS is
// service-role only, so this function is the sole writer.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (isAccountSuspended(user)) return suspendedError();

    // A sender whose messaging was suspended by the safety monitor can't send
    // anything until an admin reviews and lifts it.
    if (user.messaging_suspended) {
      return Response.json({
        error: 'Messaging is paused on your account while our safety team reviews a recent message.',
      }, { status: 403 });
    }

    const { threadId, body: rawBody } = await req.json();
    if (!threadId || !rawBody || !rawBody.trim()) {
      return Response.json({ error: 'threadId and body are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const threads = await svc.MessageThread.filter({ id: threadId });
    const thread = threads[0];
    if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 });

    // The teen, the neighbor, and the teen's linked parent can all write in a
    // booking conversation. The parent uses this same screened thread to talk to
    // the neighbor, so a safety conversation never moves to email or texts.
    const isTeenSender = user.id === thread.teen_user_id;
    const isBuyerSender = user.id === thread.buyer_user_id;
    const isParentSender = !!thread.parent_user_id && user.id === thread.parent_user_id;
    if (!isTeenSender && !isBuyerSender && !isParentSender) {
      return Response.json({ error: 'You can only send messages in your own conversations.' }, { status: 403 });
    }

    // Who this message is addressed to. A held or blocked message is withheld
    // from every recipient, while the sender keeps their own copy.
    const otherIds = (isParentSender
      ? [thread.teen_user_id, thread.buyer_user_id]
      : [isTeenSender ? thread.buyer_user_id : thread.teen_user_id]
    ).filter(Boolean);

    // Block check — either side can block the other. A parent isn't part of the
    // block relationship between the teen and the neighbor.
    if (!isParentSender) {
      const counterparty = otherIds[0];
      const [blocksBySender, blocksByOther] = await Promise.all([
        svc.Block.filter({ blocker_id: user.id, blocked_id: counterparty }),
        svc.Block.filter({ blocker_id: counterparty, blocked_id: user.id }),
      ]);
      if (blocksBySender.length > 0 || blocksByOther.length > 0) {
        return Response.json({ error: 'You cannot send messages to this user.' }, { status: 403 });
      }
    }

    const senderIsTeen = isTeenSender;

    // Age tells us whether the teen on this thread is a minor. That decides how
    // a self-harm disclosure is handled, and whether sexual content counts as
    // directed at a minor.
    let teenIsMinor = true;
    if (thread.teen_user_id) {
      try {
        const privateRows = await svc.TeenPrivateData.filter({ user_id: thread.teen_user_id });
        const age = getVerifiedAge(privateRows[0]);
        if (age != null) teenIsMinor = age < 18;
      } catch (err) {
        console.error('sendMessage age lookup failed:', err?.message);
      }
    }
    const childSafetyCase = !senderIsTeen && teenIsMinor;

    const verdict = await screenMessage({
      base44,
      body: rawBody,
      senderIsMinor: senderIsTeen && teenIsMinor,
    });

    const senderName = senderIsTeen
      ? thread.teen_display_name
      : isBuyerSender
        ? thread.buyer_name
        : (user.full_name || 'Parent');
    const allParticipants = thread.participant_ids || [thread.buyer_user_id, thread.teen_user_id, thread.parent_user_id].filter(Boolean);

    // Held and blocked messages are not delivered: leaving the recipient out of
    // participant_ids means the read rule hides the message from them entirely.
    const delivered = verdict.action === 'delivered' || verdict.action === 'masked';
    const participantIds = delivered
      ? allParticipants
      : allParticipants.filter((id) => !otherIds.includes(id));

    const storedText = verdict.action === 'masked' ? verdict.maskedText : rawBody.trim();
    const flagged = verdict.severity !== 'none';

    // Server-side idempotency: if the same sender just sent the exact same
    // message body to this thread within the last 60 seconds, return that
    // message instead of creating a duplicate.
    const recent = await svc.Message.filter(
      { thread_id: thread.id, sender_id: user.id },
      '-created_date',
      5
    );
    const dupWindow = Date.now() - 60 * 1000;
    const duplicate = recent.find(
      (m) => m.raw_body === rawBody.trim() && m.created_date && new Date(m.created_date).getTime() > dupWindow
    );
    if (duplicate) return Response.json({ message: duplicate, safety: duplicate.safety_action, notice: '' });

    const msg = await svc.Message.create({
      thread_id: thread.id,
      sender_id: user.id,
      sender_name: senderName,
      body: storedText,
      raw_body: rawBody.trim(),
      participant_ids: participantIds,
      flagged,
      pii_masked: verdict.action === 'masked',
      safety_action: verdict.action,
      safety_severity: verdict.severity,
      safety_categories: verdict.categories,
      safety_reason: verdict.reason,
      self_harm: verdict.selfHarm,
      review_state: verdict.action === 'held' ? 'held' : verdict.action === 'blocked' ? 'blocked' : 'none',
    });

    await svc.MessageThread.update(thread.id, {
      last_message: storedText.slice(0, 80),
      last_message_at: new Date().toISOString(),
    });

    // Notify the other participants — only when the message actually arrived.
    if (delivered) {
      const recipients = [...new Set(allParticipants.filter((id) => id && id !== user.id))];
      await Promise.all(
        recipients.map((id) =>
          svc.Notification.create({
            user_id: id,
            type: 'message',
            title: `New message from ${senderName}`,
            body: storedText.slice(0, 100),
            link: `/messages/${thread.id}`,
            read: false,
          })
        )
      );
    }

    // ── Record the flag, alert the right people, act on the sender ──
    let flagRecord = null;
    if (flagged) {
      flagRecord = await svc.MessageFlag.create({
        message_id: msg.id,
        thread_id: thread.id,
        booking_id: thread.booking_id || '',
        sender_id: user.id,
        sender_name: senderName,
        sender_role: senderIsTeen ? 'teen' : 'buyer',
        recipient_id: otherIds[0] || '',
        teen_user_id: thread.teen_user_id || '',
        parent_user_id: thread.parent_user_id || '',
        categories: verdict.categories,
        severity: verdict.severity,
        action_taken: verdict.action,
        reason: verdict.reason,
        excerpt: rawBody.trim().slice(0, 400),
        self_harm: verdict.selfHarm,
        urgent: verdict.severity === 'high',
        status: 'open',
        resolution: 'none',
      });
    }

    if (verdict.severity === 'medium') {
      // Held for review — tell the parent so they see it in their dashboard.
      if (thread.parent_user_id && thread.parent_user_id !== user.id) {
        await alertParentFlaggedMessage(base44, {
          parentUserId: thread.parent_user_id,
          teenName: thread.teen_display_name || 'your teen',
          severity: 'medium',
          jobTitle: thread.listing_title,
          threadId: thread.id,
          action: 'held',
        });
      }
    }

    if (verdict.severity === 'high') {
      const isChildSafety = childSafetyCase && verdict.categories.some((c) =>
        c.includes('sexual') || c.includes('grooming') || c.includes('sexual/minors'));

      // Urgent report in the admin safety queue.
      await svc.Report.create({
        reporter_id: user.id,
        reporter_name: senderName,
        subject_id: user.id,
        subject_name: senderName,
        booking_id: thread.booking_id || '',
        message_flag_id: flagRecord?.id || '',
        reason: 'safety',
        details:
          `Automatic safety monitor: a ${verdict.severity}-severity message was ${verdict.action} in a conversation ` +
          `about "${thread.listing_title || 'a booking'}".${isChildSafety ? ' The recipient is a minor.' : ''} ` +
          `See the flagged-message queue for the full text.`,
        severity: 'urgent',
        auto_flagged: true,
        status: 'open',
      });

      // Self-harm from a teen is a welfare concern: alert admins, and let the
      // admin decide whether the parent is told. Never auto-notify the parent.
      if (verdict.selfHarm && senderIsTeen) {
        await notifyAdmins(base44, {
          type: 'safety',
          title: 'Urgent — a teen disclosed self-harm',
          body: `${senderName} sent a message indicating self-harm intent. They were shown the 988 lifeline. No parent alert was sent automatically — decide how to follow up.`,
          link: `/messages/${thread.id}`,
        });
      } else {
        await notifyAdmins(base44, {
          type: 'safety',
          title: isChildSafety ? 'Urgent — possible child-safety incident in chat' : 'Urgent — message blocked',
          body: `A ${verdict.severity}-severity message from ${senderName} was blocked in "${thread.listing_title || 'a conversation'}".`,
          link: `/messages/${thread.id}`,
        });
        if (thread.parent_user_id && thread.parent_user_id !== user.id) {
          await alertParentFlaggedMessage(base44, {
            parentUserId: thread.parent_user_id,
            teenName: thread.teen_display_name || 'your teen',
            severity: 'high',
            jobTitle: thread.listing_title,
            threadId: thread.id,
            action: 'blocked',
          });
        }
      }

      // Sexual content directed at a minor: stop this account from messaging
      // anyone until an admin reviews it.
      if (isChildSafety) {
        await svc.User.update(user.id, {
          messaging_suspended: true,
          messaging_suspended_reason:
            'Automatic safety monitor: sexual content sent to a minor. Pending admin review.',
        });
      }
    } else if (verdict.severity === 'low') {
      // Contact info was hidden — the parent should still know it happened.
      if (thread.parent_user_id && thread.parent_user_id !== user.id) {
        await alertParentFlaggedMessage(base44, {
          parentUserId: thread.parent_user_id,
          teenName: thread.teen_display_name || 'your teen',
          severity: 'low',
          jobTitle: thread.listing_title,
          threadId: thread.id,
          action: 'masked',
        });
      }
    }

    return Response.json({
      message: msg,
      safety: verdict.action,
      // Generic on purpose — never names the rule that matched.
      notice: senderNotice(verdict.action),
      selfHarm: verdict.selfHarm && senderIsTeen,
    });
  } catch (error) {
    console.error('sendMessage error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});