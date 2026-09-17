import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Ban } from "lucide-react";

export default function BlockButton({ user, blockedId, blockedName }) {
  const [blocked, setBlocked] = useState(false);
  const [blockRecord, setBlockRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    (async () => {
      const existing = await base44.entities.Block.filter({ blocker_id: user.id, blocked_id: blockedId });
      setBlocked(existing.length > 0);
      setBlockRecord(existing[0] || null);
      setLoading(false);
    })();
  }, [user.id, blockedId]);

  const toggle = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (blocked && blockRecord) {
        await base44.entities.Block.delete(blockRecord.id);
        setBlocked(false);
        setBlockRecord(null);
      } else {
        const rec = await base44.entities.Block.create({ blocker_id: user.id, blocked_id: blockedId });
        setBlocked(true);
        setBlockRecord(rec);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <Ban className="w-3.5 h-3.5" /> {blocked ? "Unblock" : "Block"} {blockedName}
    </button>
  );
}