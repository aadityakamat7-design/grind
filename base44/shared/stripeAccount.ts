// Reads the payout account's legal name from Stripe so the app can tell a
// parent or independent whether the name they are about to save still matches
// the name their payouts are verified under.
export async function fetchStripeAccountName(accountId?: string | null): Promise<string | null> {
  const id = String(accountId || '').trim();
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!id || !key) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': '2025-10-29.clover' },
    });
    if (!res.ok) return null;
    const account = await res.json();
    const individual = account?.individual || {};
    const personal = [individual.first_name, individual.last_name].filter(Boolean).join(' ').trim();
    if (personal) return personal;
    return account?.business_profile?.name || account?.company?.name || null;
  } catch (err) {
    console.error('fetchStripeAccountName failed:', (err as Error)?.message);
    return null;
  }
}