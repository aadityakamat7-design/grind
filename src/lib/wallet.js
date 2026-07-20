import { base44 } from "@/api/base44Client";

export async function getOrCreateWallet(teenUserId) {
  const existing = await base44.entities.WalletAccount.filter({ teen_user_id: teenUserId });
  if (existing[0]) return existing[0];
  return base44.entities.WalletAccount.create({ teen_user_id: teenUserId, balance: 0 });
}

// Credit a job payout into the teen's wallet.
export async function creditWallet(teenUserId, amount, description) {
  const wallet = await getOrCreateWallet(teenUserId);
  await base44.entities.WalletTransaction.create({
    teen_user_id: teenUserId,
    type: "earning",
    amount,
    description,
    occurred_at: new Date().toISOString(),
  });
  await base44.entities.WalletAccount.update(wallet.id, {
    balance: Math.round(((wallet.balance || 0) + amount) * 100) / 100,
  });
}