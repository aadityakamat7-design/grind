import React from "react";
import { Link } from "react-router-dom";
import { MapPin, AlertTriangle } from "lucide-react";
import { Image } from "@/components/ui/image";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import TrustBadge from "@/components/grind/TrustBadge";
import RatingStars from "@/components/grind/RatingStars";

export default function ListingCard({ listing, teen, to }) {
  const photo = listing.photos?.[0];
  return (
    <Link
      to={to}
      className="block bg-card rounded-2xl border border-border shadow-soft hover:shadow-card transition-shadow duration-300 overflow-hidden"
    >
      {photo && (
        <Image src={photo} alt={listing.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        {listing.is_hazard_flagged && (
          <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 mb-3 text-xs text-destructive">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span><span className="font-semibold">Safety warning:</span> {listing.hazard_reason || "This listing was flagged for safety review."}</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABELS[listing.category] || listing.category}
            </p>
            <h3 className="font-semibold text-foreground mt-0.5 leading-snug truncate">{listing.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-foreground">{money(listing.price)}</p>
            <p className="text-[11px] text-muted-foreground">{listing.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            {listing.service_area || listing.teen_zip || "Local"}
          </span>
          <TrustBadge type="parent_approved" />
        </div>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center justify-between gap-2 mt-3">
          <p className="text-xs font-medium text-foreground">by {listing.teen_display_name}</p>
          {teen && (teen.review_count > 0 ? (
            <RatingStars rating={teen.avg_rating} count={teen.review_count} />
          ) : (
            <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">
              ✨ New to Kickstart
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}