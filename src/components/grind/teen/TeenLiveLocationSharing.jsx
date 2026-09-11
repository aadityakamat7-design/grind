import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Navigation, AlertCircle } from "lucide-react";

// While a job is in_progress, the teen's device watches its own GPS and
// streams coordinates to the LiveLocation actor room for this booking.
// The parent's SafetyPanel connects to the same room and renders a live map.
// Location is only shared while this component is mounted (job in progress and
// the teen has the booking open) — it stops the moment the job finishes or
// the teen leaves the page.
export default function TeenLiveLocationSharing({ booking }) {
  const [status, setStatus] = useState("starting"); // starting | sharing | denied | unavailable
  const [lastSent, setLastSent] = useState(null);
  const [now, setNow] = useState(Date.now());
  const roomRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator)) { setStatus("unavailable"); return; }

    const room = base44.actors.LiveLocation(booking.id).connect({ id: crypto.randomUUID() });
    roomRef.current = room;
    const sub = room.subscribe(() => {}); // teen only sends; no inbound needed

    setStatus("sharing");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const t = Date.now();
        if (t - lastSentAtRef.current < 8000) return; // throttle to ~every 8s
        lastSentAtRef.current = t;
        const { latitude, longitude, accuracy } = pos.coords;
        try {
          room.send({ type: "location", lat: latitude, lng: longitude, accuracy });
          setLastSent(t);
        } catch (e) {}
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      try { sub.unsubscribe(); } catch {}
      try { roomRef.current?.close(); } catch {}
    };
  }, [booking.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const secsAgo = lastSent ? Math.max(0, Math.round((now - lastSent) / 1000)) : null;

  if (status === "denied") {
    return (
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Location sharing is off. Enable location in your browser so your parent can see where you are during this job.</span>
      </div>
    );
  }
  if (status === "unavailable") {
    return (
      <div className="flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Live location isn't available on this device, so your parent can't track this job in real time.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
        <Navigation className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sharing live location
        </p>
        <p className="text-[11px] text-emerald-600 mt-0.5">
          {lastSent
            ? `Updated ${secsAgo < 5 ? "just now" : secsAgo + "s ago"} · your parent can see where you are`
            : "Waiting for GPS…"}
        </p>
      </div>
    </div>
  );
}