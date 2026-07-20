import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesWidget({ threads }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-900">Messages</h2>
        <Link to="/messages" className="text-xs font-bold text-blue-600 hover:text-blue-700">See all →</Link>
      </div>
      {threads.length === 0 ? (
        <p className="text-sm text-slate-400">No messages yet — neighbors will reach out here once they book you.</p>
      ) : (
        <div className="space-y-2.5">
          {threads.slice(0, 3).map((t) => (
            <Link key={t.id} to={`/messages/${t.id}`} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{t.buyer_name || "Neighbor"} · {t.listing_title}</p>
                <p className="text-xs text-slate-500 truncate">{t.last_message || "New conversation"}</p>
              </div>
              {t.last_message_at && (
                <p className="text-[10px] text-slate-400 shrink-0">{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}