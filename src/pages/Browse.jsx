import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import ListingCard from "@/components/grind/ListingCard";
import EmptyState from "@/components/grind/EmptyState";
import SavedTeensRow from "@/components/grind/SavedTeensRow";
import PageHeader from "@/components/grind/PageHeader";
import { CATEGORIES } from "@/lib/grind";
import PullToRefresh from "@/components/PullToRefresh";
import ErrorRetry from "@/components/grind/ErrorRetry";

export default function Browse() {
  const { user } = useOutletContext();
  const [listings, setListings] = useState([]);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const load = useCallback(async () => {
    try {
      setError(false);
      const [res, profiles] = await Promise.all([
        base44.functions.invoke("searchTeens", {}),
        base44.entities.BuyerProfile.filter({ user_id: user.id }),
      ]);
      const raw = res.data?.listings || [];
      setListings(raw.map((l) => ({
        ...l,
        service_area: l.teen_resolved_city || "Local",
        teen_zip: "",
      })));
      setBuyerProfile(profiles[0] || null);
    } catch (err) {
      console.error("Browse load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Listing.subscribe(() => load());
    return unsub;
  }, [load]);

  if (loading)
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-muted skeleton-shimmer" />
        <div className="h-12 rounded-full bg-muted skeleton-shimmer" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border h-40 skeleton-shimmer" />)}
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const myZip = buyerProfile?.zip;

  const filtered = listings
    .filter((l) => category === "all" || l.category === category)
    .filter(
      (l) =>
        !search ||
        `${l.title} ${l.description} ${l.teen_display_name}`.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aInArea = a.delivery_mode === "online" || a._inArea;
      const bInArea = b.delivery_mode === "online" || b._inArea;
      if (aInArea !== bInArea) return aInArea ? -1 : 1;
      if (a._distance != null && b._distance != null) return a._distance - b._distance;
      return 0;
    });

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-5">
        <PageHeader title="Find local help" subtitle={myZip ? `Showing teens near ${myZip}` : "Browse trusted teens in your area."}>
          {myZip && <span className="flex items-center gap-1 text-[13px] text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> {myZip}</span>}
        </PageHeader>

        <SavedTeensRow userId={user.id} />

        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <Input
            className="rounded-full pl-11 h-12 bg-card"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
              category === "all" ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card text-muted-foreground border-border"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-4 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${
                category === c.value ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card text-muted-foreground border-border"
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
            {filtered.map((l) => {
              const isOnline = l.delivery_mode === "online";
              const inArea = isOnline || l._inArea;
              return (
              <div key={l.id} className={`relative ${inArea ? "" : "opacity-50"}`}>
                <ListingCard
                  listing={l}
                  teen={{ avg_rating: l.teen_avg_rating, review_count: l.teen_review_count }}
                  to={`/teens/${l.teen_user_id}?listing=${l.id}`}
                />
                {!inArea && (
                  <span className="absolute top-2 right-2 bg-foreground text-background text-[10px] font-medium px-2 py-1 rounded-full">
                    Outside service area
                  </span>
                )}
                {!isOnline && l._distance != null && (
                  <span className="absolute top-2 left-2 bg-card/90 text-foreground text-[10px] font-medium px-2 py-1 rounded-full shadow-soft">
                    {l._distance < 1 ? "<1 mi" : `${Math.round(l._distance)} mi`}
                  </span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}