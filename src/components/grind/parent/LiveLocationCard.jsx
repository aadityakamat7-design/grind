import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Parent-side live location for one in-progress booking. Connects to the
// LiveLocation actor room (room id = booking id) and renders the teen's
// real-time GPS position on a Leaflet map. Shows a waiting placeholder until
// the first ping arrives, and a "last seen" staleness indicator if pings stop.
const teenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function LiveLocationCard({ booking }) {
  const [loc, setLoc] = useState(null);
  const [now, setNow] = useState(Date.now());
  const roomRef = useRef(null);

  useEffect(() => {
    const room = base44.actors.LiveLocation(booking.id).connect({ id: crypto.randomUUID() });
    roomRef.current = room;
    const sub = room.subscribe((msg) => {
      if (!msg) return;
      if (msg.type === "location") {
        setLoc({ lat: msg.lat, lng: msg.lng, accuracy: msg.accuracy, ts: msg.ts });
      }
    });
    return () => { try { sub.unsubscribe(); } catch {} try { roomRef.current?.close(); } catch {} };
  }, [booking.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const teenName = booking.teen_display_name?.split(" ")[0] || "your teen";
  const secsAgo = loc?.ts ? Math.max(0, Math.round((now - loc.ts) / 1000)) : null;
  const stale = loc && secsAgo > 90;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/bookings/${booking.id}`} className="min-w-0 flex-1 hover:underline">
          <p className="font-bold text-foreground text-sm truncate">{booking.teen_display_name} · {booking.listing_title}</p>
        </Link>
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
        </span>
      </div>

      <div className="mt-2.5 rounded-xl overflow-hidden border border-border h-48">
        {loc ? (
          <MapContainer center={[loc.lat, loc.lng]} zoom={16} scrollWheelZoom={false} className="w-full h-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            <Recenter lat={loc.lat} lng={loc.lng} />
            <Marker position={[loc.lat, loc.lng]} icon={teenIcon}>
              <Popup>{teenName} is here</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-sky-100 flex flex-col items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-xs font-medium text-blue-600/80">Waiting for {teenName} to share location…</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground truncate">At {booking.address || "job site"} with {booking.buyer_name}</p>
        {loc && (
          <span className={`text-[10px] font-semibold shrink-0 ${stale ? "text-amber-600" : "text-emerald-600"}`}>
            {stale ? `Last seen ${secsAgo}s ago` : secsAgo < 5 ? "Updated just now" : `Updated ${secsAgo}s ago`}
          </span>
        )}
      </div>
    </div>
  );
}