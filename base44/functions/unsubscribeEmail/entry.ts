import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// One-click unsubscribe from marketing emails. Called by the /unsubscribe
// page when a user clicks the unsubscribe link in a marketing email.
// Sets marketing_emails_unsubscribed = true on the user record.
// Takes effect immediately. Transactional emails are not affected.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email } = body;
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;

    // Find the user by email
    const users = await svc.User.filter({ email });
    const user = users?.[0];
    if (!user) {
      // Don't reveal whether the email exists — return success
      return Response.json({ unsubscribed: true });
    }

    // Set the unsubscribe flag immediately
    await svc.User.update(user.id, {
      marketing_emails_unsubscribed: true,
    });

    return Response.json({ unsubscribed: true });
  } catch (error) {
    console.error('unsubscribeEmail error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});