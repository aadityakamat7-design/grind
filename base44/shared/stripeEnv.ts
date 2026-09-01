import Stripe from 'npm:stripe@17.5.0';

// Central Stripe environment separation.
// Production always uses STRIPE_SECRET_KEY (live keys in production).
// Test mode is an admin-controlled toggle stored in the AppSetting table —
// when it's on, getStripeForApp/getStripeContext route through the test keys
// so test cards work on the published app. The toggle defaults to live/off.
export function getStripe(useTestMode = false) {
  const key = useTestMode
    ? (Deno.env.get('STRIPE_TEST_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY'))
    : Deno.env.get('STRIPE_SECRET_KEY');
  return new Stripe(key);
}

export function isLiveMode() {
  return (Deno.env.get('STRIPE_SECRET_KEY') || '').startsWith('sk_live');
}

// Reads the admin-controlled test-mode flag from AppSetting. Defaults to live
// (false) when unset or on any read error — the app never silently goes test.
export async function getTestModeEnabled(base44) {
  try {
    const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'stripe_test_mode' });
    return rows[0]?.value === 'true';
  } catch (err) {
    console.error('getTestModeEnabled error:', err.message);
    return false;
  }
}

// Returns a Stripe instance keyed to the current admin toggle state. Use this
// in every backend function that talks to Stripe so test mode is honored
// uniformly. Defaults to live.
export async function getStripeForApp(base44) {
  return getStripe(await getTestModeEnabled(base44));
}

// Returns the Stripe instance plus the resolved test-mode flag, for functions
// that also need to mark the created resource as test-mode in the database.
export async function getStripeContext(base44) {
  const testMode = await getTestModeEnabled(base44);
  return { stripe: getStripe(testMode), testMode };
}

// The publishable key matching the current mode — returned to the frontend so
// Stripe.js initialises against the right (test or live) account.
export async function getPublishableKeyForApp(base44) {
  const testMode = await getTestModeEnabled(base44);
  return testMode
    ? (Deno.env.get('STRIPE_TEST_PUBLISHABLE_KEY') || Deno.env.get('STRIPE_PUBLISHABLE_KEY'))
    : Deno.env.get('STRIPE_PUBLISHABLE_KEY');
}