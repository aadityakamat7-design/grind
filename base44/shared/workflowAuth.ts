// Shared secret that workflow definitions include in their invoke_backend_function
// args. Workflow-handler functions call verifyWorkflowCall() to confirm the
// request came from a workflow (which knows the secret) and not a random
// internet user hitting the public function URL.
//
// The secret is stored as the WORKFLOW_AUTH_SECRET app secret (set via
// Settings → Secrets) and read at runtime — never hardcoded in source.
const WORKFLOW_SECRET = Deno.env.get('WORKFLOW_AUTH_SECRET');

export function verifyWorkflowCall(body: any): Response | null {
  if (!WORKFLOW_SECRET || body?._workflowSecret !== WORKFLOW_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}