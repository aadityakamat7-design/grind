import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ChevronRight } from "lucide-react";

// Reminds a teen that earnings can't be paid out until a parent is linked and
// the parent's verification is complete. Renders nothing once both are done.
export default function EarningsSetupTip({ hasParent, verified }) {
  if (hasParent && verified) return null;

  const needsParent = !hasParent;

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-700">
          {needsParent ? "Link your parent to start working" : "Waiting on your parent's payout setup"}
        </p>
        <p className="text-xs text-amber-600 mt-1 leading-relaxed">
          {needsParent
            ? "Share your invite code with your parent or guardian. Once they link, you can take jobs, and they'll approve each one."
            : "Your parent is linked. Cash-outs unlock once they connect a payout account — they can do that from their Payouts tab."}
        </p>
        {needsParent && (
          <Link
            to="/teen"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700 mt-2 hover:underline"
          >
            Get your invite code <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}