import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Star, MapPin } from "lucide-react";

export default function RecommendedTeens({ zip }) {
  const [teens, setTeens] = useState([]);

  useEffect(() => {
    base44.entities.TeenProfile.filter({ status: "active" }, "-avg_rating", 20).then((all) => {
      const available = all.filter((t) => t.is_available !== false);
      available.sort((a, b) => (b.zip === zip) - (a.zip === zip));
      setTeens(available.slice(0, 4));
    });
  }, [zip]);

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3">Recommended near you</h2>
      {teens.length === 0 ? (
        <p className="text-sm text-slate-400">No teens nearby yet — check back soon as more join your neighborhood.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {teens.map((t) => (
            <Link key={t.id} to={`/teens/${t.user_id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-extrabold">
                {t.display_name?.charAt(0)}
              </div>
              <p className="font-bold text-slate-900 text-sm mt-2">{t.display_name}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  {t.review_count > 0 ? t.avg_rating?.toFixed(1) : "New"}
                </span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> {t.zip}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}