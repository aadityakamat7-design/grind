import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Admin-only toggle for Stripe test mode. When enabled, every backend function
// that calls getStripeForApp/getStripeContext routes through STRIPE_TEST_SECRET_KEY
// so test cards (4242…, 4000…0002) work on the published app. Defaults to live/off.
// The flag is stored in AppSetting so it survives restarts and can't be flipped
// by a non-admin — only an admin can write AppSetting (RLS), and this function
// re-checks app_role server-side regardless.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    const { enabled } = await req.json();
    const value = enabled === true ? 'true' : 'false';

    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key: 'stripe_test_mode' });
    if (existing[0]) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, {
        value,
        updated_by_id: user.id,
      });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({
        key: 'stripe_test_mode',
        value,
        label: 'Stripe test mode',
        updated_by_id: user.id,
      });
    }

    console.log(`Stripe test mode set to ${value} by ${user.email}`);
    return Response.json({ testMode: value === 'true' });
  } catch (error) {
    console.error('setTestMode error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});