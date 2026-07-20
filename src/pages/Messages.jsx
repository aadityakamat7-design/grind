import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";

export default function Messages() {
  const { user } = useOutletContext();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.MessageThread.filter(
      { participant_ids: user.id },
      "-last_message_at",
      50
    );
    setThreads(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" /></div>;

  const isParent = user.app_role === "PARENT";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Messages</h1>
        {isParent && (
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> You can read all of your teen's conversations.
          </p>
        )}
      </div>

      {threads.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No messages yet" subtitle="Conversations start when a booking is made." />
      ) : (
        <div className="space-y-3">
          {threads.map((t) => {
            const otherName = user.id === t.teen_user_id ? t.buyer_name : t.teen_display_name;
            return (
              <Link
                key={t.id}
                to={`/messages/${t.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center font-extrabold text-violet-600">
                  {otherName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-900 truncate">
                      {isParent ? `${t.teen_display_name} ↔ ${t.buyer_name}` : otherName}
                    </p>
                    {t.last_message_at && (
                      <p className="text-[11px] text-slate-400 shrink-0">{format(new Date(t.last_message_at), "MMM d")}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.last_message || t.listing_title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}