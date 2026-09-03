import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lets a parent opt into also being a buyer (neighbor) without creating a
// second account. Creates a BuyerProfile if one doesn't exist yet — the
// address/ZIP setup happens client-side via the BuyerSetupDialog after this
// function returns. The has_buyer_profile flag is set client-side via
// base44.auth.updateMe so the Layout can show buyer tabs immediately.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'parent') {
      return Response.json({ error: 'Only parents can enable buyer mode.' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;
    const existing = await svc.BuyerProfile.filter({ user_id: user.id });
    let profile = existing[0];

    if (!profile) {
      profile = await svc.BuyerProfile.create({
        user_id: user.id,
        full_name: user.full_name || '',
      });
    }

    const needsAddress = !profile.address || !profile.zip || profile.latitude == null;

    return Response.json({ profile, needsAddress, enabled: true });
  } catch (error) {
    console.error('enableBuyerMode error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});