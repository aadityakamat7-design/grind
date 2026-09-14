import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold pt-[env(safe-area-inset-top)]">
      <WifiOff className="w-4 h-4 shrink-0" />
      You're offline — some features may be unavailable.
    </div>
  );
}