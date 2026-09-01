import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public read of the Stripe test-mode flag. The frontend uses it to show the
// persistent TEST MODE banner on every screen. Returns { testMode: boolean }
// and defaults to false (live) when the setting is unset or on any read error,
// so the app never silently runs in test mode.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'stripe_test_mode' });
    return Response.json({ testMode: rows[0]?.value === 'true' });
  } catch (error) {
    console.error('getTestModeStatus error:', error.message);
    return Response.json({ testMode: false });
  }
});