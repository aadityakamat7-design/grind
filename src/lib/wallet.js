import { base44 } from "@/api/base44Client";

export async function getOrCreateWallet(teenUserId) {
  const existing = await base44.entities.WalletAccount.filter({ teen_user_id: teenUserId });
  if (existing[0]) return existing[0];
  return base44.entities.WalletAccount.create({
    teen_user_id: teenUserId,
    balance: 0,
    auto_save_pct: 0,
    card_last4: String(Math.floor(1000 + Math.random() * 9000)),
  });
}

// Credit a job payout into the teen's wallet, applying the auto-save rule to their active goal.
export async function creditWallet(teenUserId, amount, description) {
  const wallet = await getOrCreateWallet(teenUserId);
  const now = new Date().toISOString();
  let saveAmount = 0;

  if (wallet.auto_save_pct > 0) {
    const goals = await base44.entities.SavingsGoal.filter({ teen_user_id: teenUserId, status: "active" });
    const goal = goals[0];
    if (goal) {
      saveAmount = Math.round(amount * wallet.auto_save_pct) / 100;
      await base44.entities.SavingsGoal.update(goal.id, { saved_amount: (goal.saved_amount || 0) + saveAmount });
      await base44.entities.WalletTransaction.create({
        teen_user_id: teenUserId,
        type: "save",
        amount: saveAmount,
        description: `Auto-saved ${wallet.auto_save_pct}% to "${goal.name}"`,
        occurred_at: now,
      });
    }
  }

  await base44.entities.WalletTransaction.create({
    teen_user_id: teenUserId,
    type: "earning",
    amount,
    description,
    occurred_at: now,
  });
  await base44.entities.WalletAccount.update(wallet.id, {
    balance: Math.round(((wallet.balance || 0) + amount - saveAmount) * 100) / 100,
  });
}