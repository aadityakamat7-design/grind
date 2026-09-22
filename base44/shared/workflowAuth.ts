// The platform injects the WORKFLOW_SECRET app secret into every
// invoke_backend_function call made by a workflow. Workflow-handler functions
// call verifyWorkflowCall() to confirm the request came from a workflow (which
// carries the platform-injected secret) and not a random internet user hitting
// the public function URL. The secret is never hardcoded in source — it lives
// only in the app's secrets and is injected by the platform at call time.
const WORKFLOW_SECRET = Deno.env.get('WORKFLOW_SECRET');

export function verifyWorkflowCall(req: Request, body: any): Response | null {
  const headers = Object.fromEntries(req.headers.entries());
  const headerMatch = WORKFLOW_SECRET && Object.values(headers).some(v => v === WORKFLOW_SECRET);
  if (!WORKFLOW_SECRET || (body?._workflowSecret !== WORKFLOW_SECRET && !headerMatch)) {
    console.error('Workflow auth failed. Headers:', JSON.stringify(headers));
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}