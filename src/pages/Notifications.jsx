import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, ShieldCheck, ShieldAlert, CalendarDays, Wallet, MessageCircle, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";

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
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
        {hasUnread && (
          <Button variant="outline" className="rounded-xl" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

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
                  n.read ? "bg-white border-slate-100" : "bg-blue-50/60 border-blue-100"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-slate-100 text-slate-400" : "bg-blue-100 text-blue-600"}`}>
                  <Icon className="w-4.5 h-4.5 w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">
                    {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}