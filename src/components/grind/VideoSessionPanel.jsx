import React from "react";
import { Link } from "react-router-dom";
import { Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown on confirmed+ online bookings. Gives the teen and the neighbor a
// choice: start a Zoom meeting (and share the link in chat), or jump into
// the built-in Blockwork video room that was generated at booking time.
export default function VideoSessionPanel({ booking, confirmedPlus }) {
  if (!confirmedPlus || !booking.session_link) {
    return (
      <p className="flex items-center gap-2">
        <Video className="w-4 h-4 text-muted-foreground" /> Online session — link appears once confirmed
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/60 p-3 space-y-2.5">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Video className="w-4 h-4 text-primary" /> Join the video session
      </p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Start a Zoom meeting and share the link in chat, or use the built-in Blockwork video room.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a href="https://zoom.us/start/videomeeting" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full rounded-xl">
            <ExternalLink className="w-4 h-4 mr-2" /> Start on Zoom
          </Button>
        </a>
        <Link to={`/bookings/${booking.id}/video`}>
          <Button className="w-full rounded-xl">
            <Video className="w-4 h-4 mr-2" /> Blockwork video room
          </Button>
        </Link>
      </div>
    </div>
  );
}