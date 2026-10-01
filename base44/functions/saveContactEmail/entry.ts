import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Facebook can sign someone in without giving us an email address. In that case
// the person types one twice, and we keep it as their contact email.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { email, confirmEmail } = await req.json().catch(() => ({}));
    const a = String(email || '').trim().toLowerCase();
    const b = String(confirmEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a) || a.length > 200) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (a !== b) return Response.json({ error: "The two email addresses don't match." }, { status: 400 });

    await base44.asServiceRole.entities.User.update(user.id, { contact_email: a });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('saveContactEmail failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});