import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Ban } from "lucide-react";

export default function BlockButton({ user, blockedId, blockedName }) {
  const [blocked, setBlocked] = useState(false);
  const [blockRecord, setBlockRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const existing = await base44.entities.Block.filter({ blocker_id: user.id, blocked_id: blockedId });
      setBlocked(existing.length > 0);
      setBlockRecord(existing[0] || null);
      setLoading(false);
    })();
  }, [user.id, blockedId]);

  const toggle = async () => {
    if (blocked && blockRecord) {
      await base44.entities.Block.delete(blockRecord.id);
      setBlocked(false);
      setBlockRecord(null);
    } else {
      const rec = await base44.entities.Block.create({ blocker_id: user.id, blocked_id: blockedId });
      setBlocked(true);
      setBlockRecord(rec);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
    >
      <Ban className="w-3.5 h-3.5" /> {blocked ? "Unblock" : "Block"} {blockedName}
    </button>
  );
}