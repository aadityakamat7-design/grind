import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NotificationBell({ userId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    base44.entities.Notification.filter({ user_id: userId, read: false }).then((n) => setCount(n.length));
  }, [userId]);

  return (
    <Link to="/notifications" className="relative text-slate-300 hover:text-white transition-colors">
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-sky-400 text-slate-900 text-[10px] font-extrabold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}