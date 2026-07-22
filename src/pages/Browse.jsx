import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import ListingCard from "@/components/grind/ListingCard";
import EmptyState from "@/components/grind/EmptyState";
import SavedTeensRow from "@/components/grind/SavedTeensRow";
import TeensMap from "@/components/grind/browse/TeensMap";
import { CATEGORIES } from "@/lib/grind";
import { haversineMiles } from "@/lib/geo";
import PullToRefresh from "@/components/PullToRefresh";

export default function Browse() {
  const { user } = useOutletContext();
  const [listings, setListings] = useState([]);
  const [teensById, setTeensById] = useState({});
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    const [all, profiles, teens] = await Promise.all([
      base44.entities.Listing.filter({ status: "published" }, "-created_date", 100),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
      base44.entities.TeenProfile.list(undefined, 200),
    ]);
    const byId = {};
    teens.forEach((t) => { byId[t.user_id] = t; });
    setTeensById(byId);
    setListings(all.filter((l) => byId[l.teen_user_id]?.is_available !== false));
    setBuyerProfile(profiles[0] || null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const myZip = buyerProfile?.zip;
  const hasBuyerLocation = buyerProfile?.latitude != null && buyerProfile?.longitude != null;

  const withDistance = listings.map((l) => {
    const teen = teensById[l.teen_user_id];
    let distance = null;
    let inArea = true;
    if (hasBuyerLocation && teen?.latitude != null && teen?.longitude != null) {
      distance = haversineMiles(buyerProfile.latitude, buyerProfile.longitude, teen.latitude, teen.longitude);
      const sameState = teen.state && buyerProfile.state && teen.state === buyerProfile.state;
      inArea = sameState && distance <= (teen.service_radius_miles || 3);
    }
    return { ...l, _distance: distance, _inArea: inArea };
  });

  const filtered = withDistance
    .filter((l) => category === "all" || l.category === category)
    .filter(
      (l) =>
        !search ||
        `${l.title} ${l.description} ${l.teen_display_name}`.toLowerCase().includes(search.toLowerCase())
    )
    // In-service-area teens first, then by distance, then hyperlocal ZIP fallback
    .sort((a, b) => {
      if (a._inArea !== b._inArea) return a._inArea ? -1 : 1;
      if (a._distance != null && b._distance != null) return a._distance - b._distance;
      return (b.teen_zip === myZip ? 1 : 0) - (a.teen_zip === myZip ? 1 : 0);
    });

  const mapTeens = hasBuyerLocation
    ? Object.values(
        filtered.reduce((acc, l) => {
          const teen = teensById[l.teen_user_id];
          if (teen?.latitude != null && teen?.longitude != null && !acc[l.teen_user_id]) {
            acc[l.teen_user_id] = {
              id: l.teen_user_id,
              lat: teen.latitude,
              lng: teen.longitude,
              display_name: l.teen_display_name,
              inArea: l._inArea,
              to: `/teens/${l.teen_user_id}?listing=${l.id}`,
            };
          }
          return acc;
        }, {})
      )
    : [];

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Find local help</h1>
        {myZip && (
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Showing teens near {myZip}
          </p>
        )}
      </div>

      {hasBuyerLocation && mapTeens.length > 0 && (
        <TeensMap center={{ lat: buyerProfile.latitude, lng: buyerProfile.longitude }} teens={mapTeens} />
      )}

      <SavedTeensRow userId={user.id} />

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          className="rounded-xl pl-10 bg-white"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        <button
          onClick={() => setCategory("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
            category === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
              category === c.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No services found" subtitle="Try a different search or category — or check back as more teens in your area join." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((l) => (
            <div key={l.id} className={`relative ${l._inArea ? "" : "opacity-50"}`}>
              <ListingCard listing={l} teen={teensById[l.teen_user_id]} to={`/teens/${l.teen_user_id}?listing=${l.id}`} />
              {!l._inArea && (
                <span className="absolute top-2 right-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  Outside service area
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}