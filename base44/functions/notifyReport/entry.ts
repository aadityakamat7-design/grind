import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId, subjectId, subjectName, reason } = await req.json();
    if (!reportId || !subjectId) {
      return Response.json({ error: 'reportId and subjectId are required' }, { status: 400 });
    }

    await notifyAdmins(base44, {
      type: 'safety',
      title: 'New report filed',
      body: `${subjectName || 'A user'} was reported for "${reason || 'a safety concern'}". Review it in the admin dashboard.`,
      link: '/admin',
    });

    // If the reported user is a teen with a confirmed parent link, alert the parent too
    const links = await base44.asServiceRole.entities.ParentTeenLink.filter({
      teen_user_id: subjectId,
      status: 'confirmed',
    });
    if (links[0]) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: links[0].parent_user_id,
        type: 'safety',
        title: `A safety report was filed involving ${subjectName || 'your teen'}`,
        body: `Our safety team is reviewing a report about "${reason || 'a concern'}". We'll follow up if action is needed.`,
        link: '/parent',
        read: false,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('notifyReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});