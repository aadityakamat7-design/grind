import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Admin-only: approve or reject a teen's skill credential.
// The credential's status field is locked to admin-only writes via RLS,
// so this function is the only path to flip a credential to approved/rejected.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') {
      return Response.json({ error: 'Admins only' }, { status: 403 });
    }

    const body = await req.json();
    const { credentialId, decision, rejectionReason } = body;
    if (!credentialId) {
      return Response.json({ error: 'credentialId is required' }, { status: 400 });
    }
    if (decision !== 'approve' && decision !== 'reject') {
      return Response.json({ error: 'decision must be approve or reject' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const credential = await svc.Credential.get(credentialId);
    if (!credential) {
      return Response.json({ error: 'Credential not found' }, { status: 404 });
    }

    const update = {
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: user.id,
    };
    if (decision === 'reject') {
      update.rejection_reason = (rejectionReason || '').trim().slice(0, 500);
    }
    await svc.Credential.update(credentialId, update);

    return Response.json({ ok: true });
  } catch (error) {
    console.error('reviewCredential error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});