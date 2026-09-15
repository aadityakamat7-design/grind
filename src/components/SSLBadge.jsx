import React from "react";
import { Lock } from "lucide-react";

// "SSL Secured" trust badge — indicates the site is served over HTTPS
// and all data in transit is encrypted via TLS.
export default function SSLBadge({ className = "" }) {
  return (
    <a
      href="https://en.wikipedia.org/wiki/Transport_Layer_Security"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="SSL Secured — data is encrypted in transit"
      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold ${className}`}
    >
      <Lock className="w-3.5 h-3.5" />
      SSL Secured
    </a>
  );
}