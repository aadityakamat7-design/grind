import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Gate for scheduled/maintenance handlers — the functions a workflow calls
// server-to-server. The workflow engine invokes these with an admin identity,
// so that identity (not a shared secret) is what we check. The platform no
// longer injects a WORKFLOW_SECRET into the call, which is why the old secret
// check rejected every workflow run with a 401.
//
// A public call arrives with no user (→ 401) and a signed-in non-admin is
// refused (→ 403), so nobody outside the workflow engine can run these.
export async function verifyWorkflowCall(req: Request): Promise<Response | null> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }
    return null;
  } catch {
    // auth.me() throws when the request carries no valid session.
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}