import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import ListingCard from "@/components/grind/ListingCard";
import EmptyState from "@/components/grind/EmptyState";
import { CATEGORIES } from "@/lib/grind";

export default function Browse() {
  const { user } = useOutletContext();
  const [listings, setListings] = useState([]);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    const [all, profiles] = await Promise.all([
      base44.entities.Listing.filter({ status: "published" }, "-created_date", 100),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);
    setListings(all);
    setBuyerProfile(profiles[0] || null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" /></div>;

  const myZip = buyerProfile?.zip;
  const filtered = listings
    .filter((l) => category === "all" || l.category === category)
    .filter(
      (l) =>
        !search ||
        `${l.title} ${l.description} ${l.teen_display_name}`.toLowerCase().includes(search.toLowerCase())
    )
    // Hyperlocal: same-ZIP listings first
    .sort((a, b) => (b.teen_zip === myZip ? 1 : 0) - (a.teen_zip === myZip ? 1 : 0));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Find local help</h1>
        {myZip && (
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Showing teens near {myZip}
          </p>
        )}
      </div>

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
            <ListingCard key={l.id} listing={l} to={`/teens/${l.teen_user_id}?listing=${l.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}