import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Heart } from "lucide-react";

export default function SavedTeensRow({ userId }) {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    base44.entities.SavedTeen.filter({ buyer_user_id: userId }).then(setSaved);
  }, [userId]);

  if (saved.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Heart className="w-3.5 h-3.5 text-rose-400" /> Your saved teens
      </p>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {saved.map((s) => (
          <Link
            key={s.id}
            to={`/teens/${s.teen_user_id}`}
            className="flex items-center gap-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm px-3.5 py-2.5 shrink-0 hover:shadow-md transition-shadow"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white text-sm font-extrabold">
              {s.teen_display_name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{s.teen_display_name}</p>
              <p className="text-[11px] font-semibold text-blue-600">Book again →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}