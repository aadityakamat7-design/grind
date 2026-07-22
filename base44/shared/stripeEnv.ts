import Stripe from 'npm:stripe@17.5.0';

// Central Stripe environment separation.
// Production always uses STRIPE_SECRET_KEY (live keys in production).
// Development/testing can explicitly opt into the test-mode keys — callers must
// gate `useTestMode` behind an admin check so regular users can never downgrade
// a live flow to test mode.
export function getStripe(useTestMode = false) {
  const key = useTestMode
    ? (Deno.env.get('STRIPE_TEST_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY'))
    : Deno.env.get('STRIPE_SECRET_KEY');
  return new Stripe(key);
}

export function isLiveMode() {
  return (Deno.env.get('STRIPE_SECRET_KEY') || '').startsWith('sk_live');
}