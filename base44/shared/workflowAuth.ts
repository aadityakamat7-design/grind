// The platform injects the WORKFLOW_SECRET app secret into every
// invoke_backend_function call made by a workflow. Workflow-handler functions
// call verifyWorkflowCall() to confirm the request came from a workflow (which
// carries the platform-injected secret) and not a random internet user hitting
// the public function URL. The secret is never hardcoded in source — it lives
// only in the app's secrets and is injected by the platform at call time.
const WORKFLOW_SECRET = Deno.env.get('WORKFLOW_SECRET');

export function verifyWorkflowCall(body: any): Response | null {
  if (!WORKFLOW_SECRET || body?._workflowSecret !== WORKFLOW_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}