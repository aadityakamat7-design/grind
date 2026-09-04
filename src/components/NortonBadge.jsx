import React from "react";

// Norton Safe Web trust badge.
//
// Norton provides the official seal embed code (a site-specific script + hosted
// image) from their Safe Web owner dashboard AFTER the site is submitted and
// approved. Until that approval, this component links to the public Norton Safe
// Web report page for the app domain, so visitors can verify the site's rating
// directly with Norton — the link is real and valid even before verification.
//
// TODO: Once Norton approves the site, replace the rendered badge below with
// the official embed code from the Norton Safe Web dashboard so the seal pulls
// from Norton's hosted asset and links to the verified rating page.
const APP_URL = "https://blockwork.online";
const NORTON_REPORT = `https://safeweb.norton.com/report/show?url=${encodeURIComponent(APP_URL)}`;

export default function NortonBadge({ className = "" }) {
  return (
    <a
      href={NORTON_REPORT}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Norton Safe Web — view this site's safety rating"
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-700 leading-none whitespace-nowrap">
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
          <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
        </svg>
        Norton Safe Web
      </span>
    </a>
  );
}