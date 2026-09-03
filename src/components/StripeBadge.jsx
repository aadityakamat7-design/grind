import React from "react";

// Official "Powered by Stripe" trust badge. Uses Stripe's official brand
// asset from stripe.com/newsroom/brand-assets — not a recreation. Per Stripe's
// Marks Usage Agreement, businesses using Stripe may display this badge on
// checkout pages, and Stripe suggests linking it to stripe.com.
//
// The reassurance line ("Payments securely processed by Stripe. We never see
// or store your card details.") is accurate: all card data flows through
// Stripe's PCI-DSS Level 1 certified infrastructure. Our servers only receive
// a Stripe token/PaymentIntent ID — never raw card numbers, CVCs, or bank
// routing numbers. Bank details entered during Connect onboarding go directly
// to Stripe's hosted form, never through our backend.
export default function StripeBadge({ showText = true, className = "", linkTo = true }) {
  const badge = (
    <img
      src="https://images.stripeassets.com/fzn2n1nzq965/4M6d6BSWzlgsrJx8rdZb0I/733f37ef69b5ca1d3d33e127184f4ce4/Powered_by_Stripe.svg?q=80&w=1082"
      alt="Powered by Stripe"
      className="h-7"
      loading="lazy"
    />
  );
  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      {linkTo ? (
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" aria-label="Payments powered by Stripe">
          {badge}
        </a>
      ) : (
        badge
      )}
      {showText && (
        <p className="text-[11px] text-muted-foreground text-center leading-tight max-w-xs">
          Payments securely processed by Stripe. We never see or store your card details.
        </p>
      )}
    </div>
  );
}