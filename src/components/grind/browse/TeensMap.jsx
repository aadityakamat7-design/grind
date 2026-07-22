import React from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const teenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const homeIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
});

export default function TeensMap({ center, teens }) {
  const navigate = useNavigate();
  if (!center) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 h-72">
      <MapContainer center={[center.lat, center.lng]} zoom={11} scrollWheelZoom={false} className="w-full h-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[center.lat, center.lng]} icon={homeIcon}>
          <Popup>Your location</Popup>
        </Marker>
        {teens.map((t) => (
          <Marker
            key={t.id}
            position={[t.lat, t.lng]}
            icon={teenIcon}
            eventHandlers={{ click: () => navigate(t.to) }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{t.display_name}</p>
                {!t.inArea && <p className="text-rose-600 text-xs font-semibold">Outside service area</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}