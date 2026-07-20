import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { CATEGORIES, categoryLabel, money } from "@/lib/grind";
import TrustBadge from "@/components/grind/TrustBadge";
import { Input } from "@/components/ui/input";
import { Search, Star, MapPin } from "lucide-react";

export default function BuyerBrowse({ user }) {
  const [listings, setListings] = useState([]);
  const [teens, setTeens] = useState({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [zip, setZip] = useState("");

  useEffect(() => {
    (async () => {
      const [ls, profiles, buyer] = await Promise.all([
        base44.entities.Listing.filter({ status: "published" }, "-created_date", 100),
        base44.entities.TeenProfile.filter({ status: "active" }),
        base44.entities.BuyerProfile.filter({ created_by_id: user.id }),
      ]);
      const teenMap = {};
      profiles.forEach((p) => { teenMap[p.created_by_id] = p; });
      setTeens(teenMap);
      // Only listings from active (parent-approved) teens
      setListings(ls.filter((l) => teenMap[l.teen_user_id]));
      if (buyer[0]?.zip) setZip(buyer[0].zip);
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const filtered = listings.filter((l) => {
    if (category !== "all" && l.category !== category) return false;
    if (zip && l.zip && l.zip !== zip) return false;
    if (search && !`${l.title} ${l.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Find help nearby</h1>
        <p className="text-muted-foreground text-sm">Parent-approved teens in your neighborhood.</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 rounded-full" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input className="w-24 rounded-full" placeholder="ZIP" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>All</Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>
            {c.emoji} {c.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="font-heading font-semibold mb-1">No listings found</p>
          <p className="text-sm text-muted-foreground">Try clearing the ZIP filter or another category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const teen = teens[l.teen_user_id];
            return (
              <Link key={l.id} to={`/teen/${l.teen_user_id}?listing=${l.id}`} className="block bg-card border border-border rounded-2xl p-5 hover:border-primary hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">{categoryLabel(l.category)}</div>
                    <div className="font-heading font-bold truncate">{l.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{l.description}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{teen?.display_name}</span>
                      {teen?.review_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {teen.avg_rating?.toFixed(1)} ({teen.review_count})
                        </span>
                      )}
                      {l.zip && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{l.zip}</span>}
                    </div>
                    <div className="mt-2"><TrustBadge type="parent_approved" /></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-extrabold text-lg">{money(l.price)}</div>
                    <div className="text-xs text-muted-foreground">{l.price_model === "HOURLY" ? "/hour" : "fixed"}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
      }`}
    >
      {children}
    </button>
  );
}