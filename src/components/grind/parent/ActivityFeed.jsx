import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed({ notifications }) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-blue-500" /> Recent activity
      </h2>
      {notifications.length === 0 ? (
        <p className="text-sm text-slate-400">No activity yet — bookings, payments, and safety events will show up here.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {notifications.slice(0, 6).map((n) => (
            <Link key={n.id} to={n.link || "/notifications"} className="flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-slate-200" : "bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                <p className="text-xs text-slate-500 truncate">{n.body}</p>
              </div>
              <p className="text-[10px] text-slate-400 shrink-0">
                {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}