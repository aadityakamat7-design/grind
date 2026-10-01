import React from "react";
import { Link } from "react-router-dom";
import { Wallet, ArrowUpRight } from "lucide-react";
import SectionCard from "@/components/account/SectionCard";

const STATUS_TEXT = {
  not_setup: "Not set up yet",
  pending: "Setup in progress",
  active: "Active",
  restricted: "Action needed",
};

// Where payout details actually live: Stripe. Blockwork only ever shows the
// status and the masked last 4, and links out for changes.
export default function PayoutsLinkCard({ data, role }) {
  const payout = data.payout || {};
  const to = role === "parent" ? "/parent/payouts" : "/teen/wallet";

  return (
    <SectionCard icon={Wallet} title="Payouts" description="Payout details are held and verified by Stripe — never by Blockwork.">
      <div className="rounded-xl bg-secondary p-3.5 space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Stripe payout status</p>
        <p className="text-sm font-semibold text-foreground">{STATUS_TEXT[payout.connect_status] || "Not set up yet"}</p>
        {payout.bank_last4 && (
          <p className="text-[12px] text-muted-foreground">
            {payout.bank_name || "Bank account"} ending in {payout.bank_last4}
          </p>
        )}
      </div>
      <Link to={to} className="block">
        <span className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Update my payout details in Stripe <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </SectionCard>
  );
}