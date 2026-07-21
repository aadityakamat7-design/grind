import { base44 } from "@/api/base44Client";

// Read-only: wallets are created and modified exclusively by backend functions.
export async function getOrCreateWallet(teenUserId) {
  const existing = await base44.entities.WalletAccount.filter({ teen_user_id: teenUserId });
  return existing[0] || { teen_user_id: teenUserId, balance: 0 };
}