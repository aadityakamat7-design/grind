import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { maskPII } from '../../shared/piiMask.ts';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// The ONLY way to create a Message. Runs PII / off-platform masking and
// flagging server-side (based on the thread's is_confirmed state), sets
// participant_ids from the thread, and notifies admins + the teen's linked
// parent when a message is flagged. The Message entity's create RLS is
// service-role only, so this function is the sole writer.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { threadId, body: rawBody } = await req.json();
    if (!threadId || !rawBody || !rawBody.trim()) {
      return Response.json({ error: 'threadId and body are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const threads = await svc.MessageThread.filter({ id: threadId });
    const thread = threads[0];
    if (!thread) return Response.json({ error: 'Thread not found' }, { status: 404 });

    // Only the teen or the buyer can send — parents have read-only oversight
    const isParticipant = [thread.teen_user_id, thread.buyer_user_id].includes(user.id);
    if (!isParticipant) {
      return Response.json({ error: 'You can only send messages in your own conversations.' }, { status: 403 });
    }

    const { text, flagged } = maskPII(rawBody, !!thread.is_confirmed);
    const senderName = user.id === thread.teen_user_id ? thread.teen_display_name : thread.buyer_name;
    const participantIds = thread.participant_ids || [thread.buyer_user_id, thread.teen_user_id, thread.parent_user_id].filter(Boolean);

    const msg = await svc.Message.create({
      thread_id: thread.id,
      sender_id: user.id,
      sender_name: senderName,
      body: text,
      participant_ids: participantIds,
      flagged,
      pii_masked: text !== rawBody,
    });

    await svc.MessageThread.update(thread.id, {
      last_message: text.slice(0, 80),
      last_message_at: new Date().toISOString(),
    });

    // Notify other participants
    const recipients = participantIds.filter((id) => id && id !== user.id);
    await Promise.all(
      recipients.map((id) =>
        svc.Notification.create({
          user_id: id,
          type: 'message',
          title: `New message from ${senderName}`,
          body: text.slice(0, 100),
          link: `/messages/${thread.id}`,
          read: false,
        })
      )
    );

    // Flagged messages notify admins + the teen's linked parent for review
    if (flagged) {
      await notifyAdmins(base44, {
        type: 'safety',
        title: 'Flagged message in chat',
        body: `A message from ${senderName} in "${thread.listing_title}" was flagged for possible contact info or off-platform request.`,
        link: `/messages/${thread.id}`,
      });
      if (thread.parent_user_id && thread.parent_user_id !== user.id) {
        await svc.Notification.create({
          user_id: thread.parent_user_id,
          type: 'safety',
          title: 'A message was flagged in your teen\'s chat',
          body: `A message from ${senderName} in "${thread.listing_title}" was flagged. Please review the conversation.`,
          link: `/messages/${thread.id}`,
          read: false,
        });
      }
    }

    return Response.json({ message: msg });
  } catch (error) {
    console.error('sendMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});