import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";

// Standalone full-screen video room. Embeds the booking's Jitsi session
// inside Blockwork so the teen and neighbor never leave the app. Access is
// gated by getBookingDetail, so only the teen, buyer, and parent can open it.
export default function VideoRoom() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("getBookingDetail", { bookingId });
        const b = res.data?.booking;
        if (!b) { setError("Booking not found."); return; }
        if (b.delivery_mode !== "online") { setError("This booking is not an online session."); return; }
        if (!b.session_link) { setError("The video room isn't available until the booking is confirmed."); return; }
        setBooking(b);
      } catch (e) {
        setError("Couldn't load this video session.");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  // Skip Jitsi's prejoin lobby and start with mic/cam ready for a smoother
  // in-app join.
  const embedUrl = booking?.session_link
    ? `${booking.session_link}#config.prejoinPageEnabled=false&config.startWithVideoMuted=false&config.startAudioMuted=false&config.subject=Blockwork%20Session`
    : "";

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <Seo title="Video session · Blockwork" path={`/bookings/${bookingId}/video`} />
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <Link to={`/bookings/${bookingId}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{booking?.listing_title || "Video session"}</p>
          <p className="text-xs text-muted-foreground truncate">Blockwork video room</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium shrink-0">
          <Video className="w-3 h-3" /> Live
        </span>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Video className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
          <Link to={`/bookings/${bookingId}`}>
            <Button variant="outline">Back to booking</Button>
          </Link>
        </div>
      ) : (
        <iframe
          src={embedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; picture-in-picture"
          allowFullScreen
          className="flex-1 w-full border-0"
          title="Blockwork video session"
        />
      )}
    </div>
  );
}