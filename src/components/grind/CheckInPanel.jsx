import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Loader2, Home, AlertTriangle, Camera } from "lucide-react";
import { format } from "date-fns";
import { uploadPhoto } from "@/lib/imageProcessing";

// "I'm here" and "Done, heading home" for in-person jobs.
//
// Tapping "I'm here" asks for the phone's location once and checks the teen is
// within ~250m of the job address. Out of range or location denied STILL checks
// in — it just marks "Location not confirmed" on the parent's alert, because
// blocking a teen from checking in is worse than an unconfirmed check-in.
export default function CheckInPanel({ booking, isTeen, onChanged }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [beforePhoto, setBeforePhoto] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!booking || booking.delivery_mode === "online") return null;

  const status = booking.status;
  const eligible = ["confirmed", "in_progress"].includes(status);
  const startMs = booking.scheduled_start ? new Date(booking.scheduled_start).getTime() : null;
  const canCheckInNow = !startMs || Date.now() >= startMs - 30 * 60 * 1000;

  const currentPosition = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });

  const call = async (action, extra = {}) => {
    setWorking(true);
    setError("");
    try {
      const coords = action === "check_in" ? await currentPosition() : await currentPosition();
      const res = await base44.functions.invoke("checkIn", {
        bookingId: booking.id,
        action,
        lat: coords?.lat,
        lng: coords?.lng,
        ...extra,
      });
      const payload = res.data || {};
      if (payload.error) throw new Error(payload.error);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Couldn't complete that. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const pickBefore = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadPhoto(file);
      setBeforePhoto(url);
    } catch (err) {
      setError(err.message || "Couldn't upload that photo.");
    } finally {
      setUploading(false);
    }
  };

  // ── Teen view ──
  if (isTeen && eligible) {
    if (!booking.check_in_at) {
      return (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="font-bold text-foreground text-sm">Check in when you arrive</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Your parent gets a note the moment you check in, so they know you got there safely.
          </p>

          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              id={`before-photo-${booking.id}`}
              className="hidden"
              onChange={(e) => pickBefore(e.target.files?.[0])}
            />
            <label
              htmlFor={`before-photo-${booking.id}`}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border p-2.5 cursor-pointer hover:bg-accent transition-colors"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">
                {beforePhoto ? "Before photo added ✓" : "Add a 'before' photo (optional)"}
              </span>
            </label>
            <p className="text-[11px] text-muted-foreground ml-1">Take a photo of the work, not people.</p>
          </div>

          <Button
            className="w-full rounded-xl"
            disabled={working || !canCheckInNow}
            onClick={() => call("check_in", beforePhoto ? { beforePhoto } : {})}
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Home className="w-4 h-4 mr-2" /> I'm here</>}
          </Button>
          {!canCheckInNow && (
            <p className="text-[11px] text-muted-foreground text-center">
              You can check in starting 30 minutes before the job.
            </p>
          )}
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
      );
    }

    if (!booking.check_out_at) {
      return (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-sm font-bold">
              Checked in at {format(new Date(booking.check_in_at), "h:mm a")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {booking.check_in_location_confirmed
              ? "Location confirmed — your parent was told you arrived."
              : "Location not confirmed — your parent was told you arrived."}
          </p>
          <Button variant="outline" className="w-full rounded-xl" disabled={working} onClick={() => call("check_out")}>
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Home className="w-4 h-4 mr-2" /> Done, heading home</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            This tells your parent you're on your way. It's separate from finishing the job.
          </p>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
      );
    }

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-emerald-700">
            Checked out at {format(new Date(booking.check_out_at), "h:mm a")}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Your parent knows you're heading home.
            {!booking.check_out_location_confirmed && " Location not confirmed."}
          </p>
        </div>
      </div>
    );
  }

  // ── Everyone else: status only (no teen locations, ever) ──
  if (!booking.check_in_at) {
    if (!eligible) return null;
    return (
      <div className="flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Not checked in yet. {booking.teen_display_name} checks in when they arrive.</span>
      </div>
    );
  }

  return (
    <div className="bg-secondary border border-border rounded-2xl p-3 text-xs text-muted-foreground space-y-1">
      <p className="flex items-center gap-1.5 text-foreground font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Checked in {format(new Date(booking.check_in_at), "h:mm a")}
        {booking.check_in_location_confirmed === false && " · Location not confirmed"}
      </p>
      {booking.check_out_at ? (
        <p>
          Checked out {format(new Date(booking.check_out_at), "h:mm a")}
          {booking.check_out_location_confirmed === false && " · Location not confirmed"}
        </p>
      ) : (
        <p>Still on the job.</p>
      )}
    </div>
  );
}