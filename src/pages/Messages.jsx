import React, { useState, useEffect, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { parseUTC } from "@/lib/grind";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";

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
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  const isParent = user.app_role === "parent";

  return (
    <div className="space-y-5">
      <PageHeader title="Messages" subtitle={isParent ? "You can read all of your teen's conversations." : "Your conversations with neighbors and teens."}>
        {isParent && <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Eye className="w-4 h-4" /> Read-only</span>}
      </PageHeader>

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
                className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-[15px] shrink-0">
                  {otherName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate text-[15px]">
                      {isParent ? `${t.teen_display_name} ↔ ${t.buyer_name}` : otherName}
                    </p>
                    {t.last_message_at && (
                      <p className="text-[11px] text-muted-foreground shrink-0">{format(parseUTC(t.last_message_at), "MMM d")}</p>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate mt-0.5">{t.last_message || t.listing_title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}