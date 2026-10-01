import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { writeAuditLog } from '../../shared/auditLog.ts';

// Admin decisions on flagged messages. Every decision is written to the audit
// log. Actions:
//
//   approve   — release a held message to its recipient and tell them it arrived
//   block     — confirm the block (the message stays undelivered)
//   clear     — no real risk (a masked message stays as delivered)
//   lift_suspension — restore the sender's ability to message
//
// The queue itself lives in the admin Moderation tab.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const isAdmin = user && (String(user.role || '').toLowerCase() === 'admin' || user.app_role === 'admin');
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { flagId, action, note } = await req.json();
    if (!flagId || !['approve', 'block', 'clear', 'lift_suspension'].includes(action)) {
      return Response.json({ error: 'flagId and a valid action are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    let flag;
    try {
      flag = await svc.MessageFlag.get(flagId);
    } catch {
      flag = null;
    }
    if (!flag) return Response.json({ error: 'Flag not found' }, { status: 404 });

    const cleanNote = String(note || '').trim().slice(0, 500);
    const resolution = action === 'approve' ? 'approved' : action === 'block' ? 'blocked' : action === 'clear' ? 'cleared' : 'none';

    if (action === 'lift_suspension') {
      if (!flag.sender_id) return Response.json({ error: 'No sender on this flag.' }, { status: 400 });
      await svc.User.update(flag.sender_id, { messaging_suspended: false, messaging_suspended_reason: '' });
      await svc.Notification.create({
        user_id: flag.sender_id,
        type: 'safety',
        title: 'Messaging restored',
        body: 'Our safety team reviewed the message and your messaging is active again. Please keep contact details and payments inside Blockwork.',
        link: '/messages',
        read: false,
      });
      await writeAuditLog(base44, {
        actor_user_id: user.id,
        actor_role: 'admin',
        action: 'messaging_suspension_lifted',
        category: 'security',
        target_type: 'User',
        target_id: flag.sender_id,
        summary: `Messaging restored for ${flag.sender_name || flag.sender_id}`,
        metadata: { flag_id: flag.id, note: cleanNote },
      });
      return Response.json({ ok: true });
    }

    // Release a held message: the recipient joins participant_ids again, which
    // is what makes the message readable to them under the entity's read rule.
    if (action === 'approve' && flag.message_id) {
      let msg;
      try {
        msg = await svc.Message.get(flag.message_id);
      } catch {
        msg = null;
      }
      if (msg) {
        const participants = [...new Set([...(msg.participant_ids || []), flag.recipient_id].filter(Boolean))];
        await svc.Message.update(msg.id, {
          participant_ids: participants,
          review_state: 'approved',
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
        });
        if (flag.recipient_id) {
          await svc.Notification.create({
            user_id: flag.recipient_id,
            type: 'message',
            title: `New message from ${flag.sender_name || 'a Blockwork user'}`,
            body: String(msg.body || '').slice(0, 100),
            link: `/messages/${flag.thread_id}`,
            read: false,
          });
        }
      }
    }

    if (action === 'block' && flag.message_id) {
      try {
        await svc.Message.update(flag.message_id, {
          review_state: 'blocked',
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('moderationAction block update failed:', err?.message);
      }
    }

    await svc.MessageFlag.update(flag.id, {
      status: 'handled',
      resolution,
      resolution_note: cleanNote,
      resolved_by_id: user.id,
      resolved_at: new Date().toISOString(),
    });

    await writeAuditLog(base44, {
      actor_user_id: user.id,
      actor_role: 'admin',
      action: `message_flag_${resolution}`,
      category: 'security',
      target_type: 'MessageFlag',
      target_id: flag.id,
      summary: `Flagged message (${flag.severity}) ${resolution}${cleanNote ? ` — ${cleanNote}` : ''}`,
      metadata: {
        message_id: flag.message_id,
        thread_id: flag.thread_id,
        sender_id: flag.sender_id,
        severity: flag.severity,
        categories: flag.categories || [],
      },
    });

    return Response.json({ ok: true, resolution });
  } catch (error) {
    console.error('moderationAction error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});