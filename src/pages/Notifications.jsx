import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, ShieldCheck, ShieldAlert, CalendarDays, Wallet, MessageCircle, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseUTC } from "@/lib/grind";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";

const TYPE_ICONS = {
  approval: ShieldCheck,
  booking: CalendarDays,
  payment: Wallet,
  message: MessageCircle,
  review: Star,
  safety: ShieldAlert,
};

export default function Notifications() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50);
    setItems(data);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const open = async (n) => {
    if (!n.read) await base44.entities.Notification.update(n.id, { read: true });
    if (n.link) navigate(n.link);
    else load();
  };

  const markAllRead = async () => {
    await base44.entities.Notification.updateMany({ user_id: user.id, read: false }, { $set: { read: true } });
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="Approvals, bookings, payments, and messages.">
        {hasUnread && (
          <Button variant="outline" className="rounded-full" onClick={markAllRead}>Mark all read</Button>
        )}
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" subtitle="Approvals, bookings, payments, and messages will show up here." />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  n.read ? "bg-card border-border" : "bg-secondary border-border"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] ${n.read ? "font-medium text-muted-foreground" : "font-bold text-foreground"}`}>{n.title}</p>
                  {n.body && <p className="text-[12px] text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {n.created_date ? formatDistanceToNow(parseUTC(n.created_date), { addSuffix: true }) : ""}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}