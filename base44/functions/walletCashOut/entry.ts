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

    // Check if the parent has locked withdrawals for this teen
    const links = await base44.asServiceRole.entities.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
    const link = links[0];
    if (link?.withdrawals_locked) {
      return Response.json({
        success: false,
        locked: true,
        message: 'Your parent has paused withdrawals. Ask them to re-enable withdrawals from their dashboard.',
      });
    }

    // Record the cash-out as "processing" — funds settle in 24-48 hours.
    // The wallet balance is deducted immediately so the teen can't double-spend;
    // the actual transfer to the parent's bank happens via the normal payout flow.
    await base44.asServiceRole.entities.WalletTransaction.create({
      teen_user_id: user.id,
      type: 'cashout',
      status: 'processing',
      amount: amt,
      description: 'Cash-out — processing (24-48 hours)',
      occurred_at: new Date().toISOString(),
    });
    await base44.asServiceRole.entities.WalletAccount.update(wallet.id, {
      balance: Math.round(((wallet.balance || 0) - amt) * 100) / 100,
    });

    if (link?.parent_user_id) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: link.parent_user_id,
        type: 'payment',
        title: 'Teen cash-out requested',
        body: `$${amt.toFixed(2)} cash-out requested from the Blockwork Wallet. Processing in 24-48 hours.`,
        link: '/parent/payouts',
      });
    }

    return Response.json({
      success: true,
      processing: true,
      message: 'Cash-out submitted. Please allow 24-48 hours for processing.',
    });
  } catch (error) {
    console.error('walletCashOut error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});