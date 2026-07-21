import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount } = await req.json();
    const amt = Math.round((Number(amount) || 0) * 100) / 100;
    if (amt <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

    // Only the teen's own wallet, validated server-side
    const wallets = await base44.asServiceRole.entities.WalletAccount.filter({ teen_user_id: user.id });
    const wallet = wallets[0];
    if (!wallet || (wallet.balance || 0) < amt) {
      return Response.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    await base44.asServiceRole.entities.WalletTransaction.create({
      teen_user_id: user.id,
      type: 'cashout',
      amount: amt,
      description: 'Instant cash-out to parent account',
      occurred_at: new Date().toISOString(),
    });
    await base44.asServiceRole.entities.WalletAccount.update(wallet.id, {
      balance: Math.round(((wallet.balance || 0) - amt) * 100) / 100,
    });

    const links = await base44.asServiceRole.entities.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
    if (links[0]?.parent_user_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: links[0].parent_user_id,
        type: 'payment',
        title: 'Teen cash-out',
        body: `$${amt.toFixed(2)} was cashed out from the KickStart Wallet to your account.`,
        link: '/parent/payouts',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('walletCashOut error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});