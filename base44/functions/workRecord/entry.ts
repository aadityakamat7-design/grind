import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getOrBuildWorkRecord } from '../../shared/workRecord.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';

// The Verified Work Record.
//
//   get            — the teen, their linked parent, or an admin. Rebuilds the
//                    record from completed, paid-out bookings only.
//   set_visibility — the teen or their linked parent turns the public
//                    verification link on or off.
//   verify         — PUBLIC (no sign-in): a school or employer opens
//                    blockwork.online/verify/{id} and sees the same totals.
//
// Nothing here is typed in by hand — every number comes from a booking whose
// payment was actually released.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, teenUserId, recordId, enabled } = await req.json();
    const svc = base44.asServiceRole.entities;

    // ── Public verification (no auth) ──
    if (action === 'verify') {
      if (!recordId) return Response.json({ error: 'recordId required' }, { status: 400 });
      const rows = await svc.WorkRecord.filter({ record_id: String(recordId).trim().toUpperCase() });
      const record = rows[0];
      if (!record) return Response.json({ found: false });
      if (record.enabled === false) {
        return Response.json({
          found: true,
          enabled: false,
          teen_display_name: record.teen_display_name,
        });
      }
      return Response.json({
        found: true,
        enabled: true,
        record: {
          record_id: record.record_id,
          teen_display_name: record.teen_display_name,
          city: record.city,
          state: record.state,
          jobs_completed: record.jobs_completed,
          hours_total: record.hours_total,
          categories: record.categories || [],
          avg_rating: record.avg_rating,
          review_count: record.review_count,
          jobs: record.jobs || [],
          reviews: record.reviews || [],
          first_job_at: record.first_job_at,
          last_job_at: record.last_job_at,
          generated_at: record.generated_at,
        },
      });
    }

    // ── Everything below needs a signed-in user ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let targetTeenId = user.id;
    if (teenUserId && teenUserId !== user.id) {
      // Only a linked parent or an admin can open someone else's record.
      const isAdmin = String(user.role || '').toLowerCase() === 'admin' || user.app_role === 'admin';
      const links = isAdmin ? [] : await svc.ParentTeenLink.filter({
        parent_user_id: user.id,
        teen_user_id: teenUserId,
        status: 'confirmed',
      });
      if (!isAdmin && links.length === 0) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetTeenId = teenUserId;
    }

    if (action === 'set_visibility') {
      const record = await getOrBuildWorkRecord(svc, targetTeenId);
      await svc.WorkRecord.update(record.id, { enabled: enabled !== false });
      await writeAuditLog(base44, {
        actor_user_id: user.id,
        actor_role: user.app_role || 'user',
        action: 'work_record_visibility',
        category: 'security',
        target_type: 'WorkRecord',
        target_id: record.record_id,
        summary: `Work Record verification link ${enabled !== false ? 'enabled' : 'disabled'}`,
        metadata: { teen_user_id: targetTeenId },
      });
      return Response.json({ ok: true, record: { ...record, enabled: enabled !== false } });
    }

    // Default: build and return the record.
    const record = await getOrBuildWorkRecord(svc, targetTeenId);
    return Response.json({ record });
  } catch (error) {
    console.error('workRecord error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});