import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { markParentVerified } from '../../shared/identityVerification.ts';

// AI photo-based government ID verification, run entirely server-side so the
// verified flags can never be set by the client.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl, role } = await req.json();
    if (!fileUrl) return Response.json({ error: 'fileUrl required' }, { status: 400 });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt:
        "You are an identity document verifier. Analyze the attached photo and determine whether it shows a real, physical government-issued photo ID (driver's license, state ID card, or passport). " +
        'Check that: it is actually an ID document (not a random photo, screenshot, or drawing), it contains a portrait photo, printed name, and document details, and it does not show obvious signs of tampering or being a fake/toy ID. ' +
        "Be reasonably strict: blurry photos where details can't be read should be rejected with reason 'photo too blurry'. " +
        'Return JSON with: is_valid_id (true only if this looks like a real government-issued photo ID), id_type (e.g. driving_license, state_id, passport, or unknown), full_name (name printed on the ID, or empty), reason (short human-readable explanation if rejected).',
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          is_valid_id: { type: 'boolean' },
          id_type: { type: 'string' },
          full_name: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    });

    if (!result?.is_valid_id) {
      return Response.json({
        verified: false,
        reason: result?.reason || "The photo doesn't appear to show a valid government-issued ID.",
      });
    }

    if (role === 'BUYER') {
      const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ user_id: user.id });
      if (!profiles[0]) return Response.json({ error: 'Buyer profile not found' }, { status: 400 });
      await base44.asServiceRole.entities.BuyerProfile.update(profiles[0].id, {
        id_verification_status: 'verified',
      });
    } else {
      await markParentVerified(base44, user.id, { id_type: result.id_type || 'unknown' }, user.full_name || '');
    }

    return Response.json({ verified: true });
  } catch (error) {
    console.error('verifyIdPhoto error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});