import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

export default function SavedWorkers({ saved }) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <Heart className="w-4 h-4 text-rose-400" /> Saved workers
      </h2>
      {saved.length === 0 ? (
        <p className="text-sm text-slate-400">No favorites yet — tap the heart on a teen's profile to save them for one-tap rebooking.</p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {saved.map((s) => (
            <div key={s.id} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-3.5 py-2.5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white text-sm font-extrabold">
                {s.teen_display_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{s.teen_display_name}</p>
                <Link to={`/teens/${s.teen_user_id}`} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
                  Rebook →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}