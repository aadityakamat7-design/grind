import React, { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Mobile pull-to-refresh: pull down from the top of the page to trigger onRefresh.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = (e) => {
    startY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.4, 80));
  };

  const onTouchEnd = async () => {
    startY.current = null;
    if (pull > 55 && !refreshing) {
      setRefreshing(true);
      setPull(44);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-end justify-center overflow-hidden"
        style={{ height: pull, transition: refreshing || pull === 0 ? "height 0.2s ease" : "none" }}
      >
        <Loader2
          className={`w-5 h-5 text-blue-500 mb-2 ${refreshing ? "animate-spin" : ""}`}
          style={{ opacity: Math.min(pull / 55, 1), transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}