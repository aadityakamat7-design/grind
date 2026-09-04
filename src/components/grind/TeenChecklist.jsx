import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

export default function TeenChecklist({ profile, bookings = [] }) {
  const [listingCount, setListingCount] = useState(null);

  useEffect(() => {
    if (!profile) return;
    base44.entities.Listing.filter({ teen_user_id: profile.user_id }).then((l) => setListingCount(l.length));
  }, [profile]);

  if (!profile || listingCount === null) return null;

  const items = [
    { label: "Create your profile", done: true, to: null },
    { label: "Publish your first service", done: listingCount > 0, to: "/teen/listings" },
    { label: "Complete your first job", done: bookings.some((b) => b.status === "completed"), to: "/teen/bookings" },
  ];
  if (items.every((i) => i.done)) return null;
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900 text-sm">Getting started</p>
        <p className="text-xs font-semibold text-blue-600">{doneCount}/{items.length}</p>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <div className="mt-3 space-y-2">
        {items.map((i) => (
          <div key={i.label} className="flex items-center justify-between gap-2">
            <p className={`flex items-center gap-2 text-sm ${i.done ? "text-slate-400 line-through" : "text-slate-700 font-semibold"}`}>
              {i.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
              {i.label}
            </p>
            {!i.done && i.to && (
              <Link to={i.to} className="flex items-center gap-0.5 text-xs font-bold text-blue-600 hover:text-blue-700 shrink-0">
                Do it <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}