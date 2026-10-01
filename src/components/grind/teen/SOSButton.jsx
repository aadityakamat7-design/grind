import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, ShieldCheck } from "lucide-react";

// The teen's SOS button. Hold it for 2 seconds so it can't go off by accident.
//
// 911 is NEVER called automatically — the screen puts a big "Call 911" button
// in front of the teen and lets them decide. Pressing SOS alerts the parent
// (app + email, with location, job, address and the neighbor's name) and
// Blockwork's safety team, and files an urgent report.
const HOLD_MS = 2000;

export default function SOSButton({ booking, onChanged }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const startedRef = useRef(0);

  const active = !!booking?.sos_at && !booking?.sos_resolved_at;

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const currentPosition = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    });

  const trigger = async () => {
    setBusy(true);
    setError("");
    try {
      const coords = await currentPosition();
      await base44.functions.invoke("triggerSOS", {
        bookingId: booking.id,
        action: "sos",
        lat: coords?.lat,
        lng: coords?.lng,
      });
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't send the alert. Call your parent now.");
    } finally {
      setBusy(false);
    }
  };

  const startHold = () => {
    if (busy || active) return;
    setHolding(true);
    startedRef.current = Date.now();
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - startedRef.current) / HOLD_MS) * 100);
      setProgress(pct);
      if (pct < 100) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(async () => {
      setHolding(false);
      setProgress(0);
      await trigger();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    clearTimeout(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    setHolding(false);
    setProgress(0);
  };

  const markSafe = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("triggerSOS", { bookingId: booking.id, action: "safe" });
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't update that.");
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    return (
      <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <p className="font-bold text-destructive text-base">SOS sent</p>
        </div>
        <p className="text-sm font-semibold text-foreground">If you're in danger, call 911 now.</p>
        <a href="tel:911" className="block">
          <Button variant="destructive" size="lg" className="w-full rounded-xl h-14 text-lg">
            <Phone className="w-5 h-5 mr-2" /> Call 911
          </Button>
        </a>
        <p className="text-xs text-muted-foreground">
          Your parent and the Blockwork safety team have been alerted with your location and this job's details.
        </p>
        <Button variant="outline" className="w-full rounded-xl" disabled={busy} onClick={markSafe}>
          <ShieldCheck className="w-4 h-4 mr-2" /> I'm safe now
        </Button>
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }

  if (booking?.sos_resolved_at) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary p-3 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        You marked yourself safe. Your parent was told.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-label="Hold for two seconds to send an SOS alert to your parent"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        disabled={busy}
        className="relative w-full h-14 rounded-2xl bg-destructive text-destructive-foreground font-bold select-none overflow-hidden active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <span
          className="absolute inset-y-0 left-0 bg-white/25 transition-none"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
        <span className="relative flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {holding ? "Keep holding…" : "SOS"}
        </span>
      </button>
      <p className="text-[11px] text-muted-foreground text-center">
        Hold for 2 seconds. Alerts your parent and Blockwork — it does not call 911 for you.
      </p>
      {error && <p className="text-xs text-destructive font-medium text-center">{error}</p>}
    </div>
  );
}