import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Zap, Sun, Video, ArrowUpRight } from "lucide-react";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import StatusBadge from "@/components/grind/StatusBadge";

const SAMPLE_LISTINGS = [
  {
    id: "sample-1",
    title: "Lawn mowing — front and back yard",
    category: "lawn_care",
    price: 40,
    price_model: "FIXED",
    zip: "94536",
    status: "open",
    is_asap: false,
    delivery_mode: "outdoor",
  },
  {
    id: "sample-2",
    title: "Algebra 2 tutoring — weekly sessions",
    category: "tutoring",
    price: 25,
    price_model: "HOURLY",
    zip: "94536",
    status: "open",
    is_asap: true,
    delivery_mode: "online",
  },
  {
    id: "sample-3",
    title: "SUV wash and vacuum",
    category: "car_washing",
    price: 35,
    price_model: "FIXED",
    zip: "94536",
    status: "open",
    is_asap: false,
    delivery_mode: "outdoor",
  },
];

export default function MyListingsSection({ listings = [] }) {
  const isSample = listings.length === 0;
  const showListings = isSample ? SAMPLE_LISTINGS : listings;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-bold text-foreground">My listings</h2>
        <Link to="/jobs" className="text-[13px] font-semibold text-primary hover:underline flex items-center gap-1">
          Post a job <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {isSample && (
        <p className="text-[12px] text-muted-foreground mb-3">
          Here's what your job posts will look like to neighborhood teens. Post your first job to get started.
        </p>
      )}
      <div className="space-y-3">
        {showListings.map((job) => (
          <div key={job.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {CATEGORY_LABELS[job.category] || job.category}
                </p>
                <h3 className="font-semibold text-foreground mt-0.5 leading-snug truncate">{job.title}</h3>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-foreground">{money(job.price)}</p>
                <p className="text-[11px] text-muted-foreground">{job.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusBadge status={job.status} />
              {job.is_asap && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber/10 text-amber border border-amber/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  <Zap className="w-3 h-3" /> ASAP
                </span>
              )}
              {job.delivery_mode === "online" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                  <Video className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                  <Sun className="w-3 h-3" /> Outdoor
                </span>
              )}
              {job.zip && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> ZIP {job.zip}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}