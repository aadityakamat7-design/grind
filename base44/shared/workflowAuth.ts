// Shared secret that workflow definitions include in their invoke_backend_function
// args. Workflow-handler functions call verifyWorkflowCall() to confirm the
// request came from a workflow (which knows the secret) and not a random
// internet user hitting the public function URL.
const WORKFLOW_SECRET = 'ks_wf_8f3a7b2c5e8d1a4f6b9c3e7a2d5f8b1e';

export function verifyWorkflowCall(body: any): Response | null {
  if (body?._workflowSecret !== WORKFLOW_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}