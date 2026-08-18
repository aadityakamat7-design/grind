import React, { useMemo } from "react";
import { CategoryBarChart } from "@/components/grind/TimeRangeChart";
import { CATEGORY_LABELS } from "@/lib/grind";
import { BarChart3 } from "lucide-react";

export default function CategoryBreakdown({ bookings, listings }) {
  const data = useMemo(() => {
    const listingCategoryMap = {};
    (listings || []).forEach((l) => { listingCategoryMap[l.id] = l.category; });

    const byCat = {};
    bookings.forEach((b) => {
      if (b.status !== "completed" || b.payment_status !== "released") return;
      const cat = listingCategoryMap[b.listing_id] || "other";
      byCat[cat] = (byCat[cat] || 0) + (b.net_amount || 0);
    });

    return Object.entries(byCat)
      .map(([cat, value]) => ({ label: CATEGORY_LABELS[cat] || cat, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [bookings, listings]);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center">
        <BarChart3 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No completed jobs yet — your category breakdown will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="w-[18px] h-[18px] text-muted-foreground" /> Earnings by service
      </h2>
      <CategoryBarChart data={data} height={Math.max(200, data.length * 40)} />
    </div>
  );
}