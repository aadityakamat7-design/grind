import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Heart } from "lucide-react";

export default function SaveTeenButton({ buyer, teenUserId, teenName }) {
  const [record, setRecord] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    base44.entities.SavedTeen.filter({ buyer_user_id: buyer.id, teen_user_id: teenUserId }).then((r) => {
      setRecord(r[0] || null);
      setReady(true);
    });
  }, [buyer.id, teenUserId]);

  const toggle = async () => {
    if (record) {
      await base44.entities.SavedTeen.delete(record.id);
      setRecord(null);
    } else {
      const r = await base44.entities.SavedTeen.create({
        buyer_user_id: buyer.id,
        teen_user_id: teenUserId,
        teen_display_name: teenName,
      });
      setRecord(r);
    }
  };

  if (!ready) return null;
  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors ${
        record ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${record ? "fill-rose-500" : ""}`} />
      {record ? "Saved" : "Save"}
    </button>
  );
}