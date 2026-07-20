import React from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Image } from "@/components/ui/image";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import TrustBadge from "@/components/grind/TrustBadge";
import RatingStars from "@/components/grind/RatingStars";

export default function ListingCard({ listing, teen, to }) {
  const photo = listing.photos?.[0];
  return (
    <Link
      to={to}
      className="block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {photo && (
        <Image src={photo} alt={listing.title} className="w-full h-36 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              {CATEGORY_LABELS[listing.category] || listing.category}
            </p>
            <h3 className="font-bold text-slate-900 mt-0.5 leading-snug">{listing.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <p className="font-extrabold text-slate-900">{money(listing.price)}</p>
            <p className="text-[11px] text-slate-400">{listing.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            {listing.service_area || listing.teen_zip || "Local"}
          </span>
          <TrustBadge type="parent_approved" />
        </div>
        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center justify-between gap-2 mt-3">
          <p className="text-xs font-semibold text-slate-700">by {listing.teen_display_name}</p>
          {teen && (teen.review_count > 0 ? (
            <RatingStars rating={teen.avg_rating} count={teen.review_count} />
          ) : (
            <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
              ✨ New to Grind
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}