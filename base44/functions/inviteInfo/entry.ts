import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { cleanCode, clientIp, overLimit } from '../../shared/entryIntent.ts';

// Public (no sign-in needed): is this parent invite code still good, and whose is
// it? Returns only the teen's public display name (first name + last initial).
// Limited to 20 lookups a minute per IP so codes can't be guessed in bulk.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body: any = await req.json().catch(() => ({}));
    const code = cleanCode(body?.code);
    if (!code) return Response.json({ valid: false });

    const svc = base44.asServiceRole.entities;
    if (await overLimit(svc, clientIp(req), 'invite-lookup', 20, 60 * 1000)) {
      return Response.json(
        { valid: false, error: 'Too many tries. Wait a minute and open the link again.', code: 'rate_limited' },
        { status: 429 },
      );
    }

    const teens = await svc.TeenProfile.filter({ invite_code: code });
    const teen = teens[0];
    if (!teen || teen.status === 'suspended') return Response.json({ valid: false });
    return Response.json({ valid: true, teenName: teen.display_name });
  } catch (error: any) {
    console.error('inviteInfo failed:', error?.message || error);
    return Response.json({ valid: false, error: "Couldn't check this invite right now. Try again in a moment." }, { status: 500 });
  }
});