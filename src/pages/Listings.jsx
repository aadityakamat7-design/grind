import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { categoryLabel, money } from "@/lib/grind";
import ListingForm from "@/components/listings/ListingForm";
import { Button } from "@/components/ui/button";
import { Plus, Pause, Play, Trash2, Pencil } from "lucide-react";

export default function Listings() {
  const { user } = useOutletContext();
  const [listings, setListings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [ls, profiles] = await Promise.all([
      base44.entities.Listing.filter({ teen_user_id: user.id }, "-created_date"),
      base44.entities.TeenProfile.filter({ created_by_id: user.id }),
    ]);
    setListings(ls);
    setProfile(profiles[0] || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.id]);

  const togglePause = async (l) => {
    await base44.entities.Listing.update(l.id, { status: l.status === "paused" ? "published" : "paused" });
    load();
  };

  const remove = async (l) => {
    await base44.entities.Listing.delete(l.id);
    load();
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const canPublish = profile?.status === "active";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">My listings</h1>
          <p className="text-muted-foreground text-sm">Services you offer to neighbors.</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="rounded-full" disabled={!canPublish}>
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      {!canPublish && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Your parent needs to link and approve your account before you can publish listings.
        </div>
      )}

      {listings.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="font-heading font-semibold mb-1">No listings yet</p>
          <p className="text-sm text-muted-foreground">Create your first service and start earning.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{categoryLabel(l.category)}</div>
                  <div className="font-heading font-bold">{l.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{l.description}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold">{money(l.price)}</div>
                  <div className="text-xs text-muted-foreground">{l.price_model === "HOURLY" ? "/hour" : "fixed"}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  l.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  {l.status === "published" ? "Live" : "Paused"}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setFormOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => togglePause(l)}>
                    {l.status === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(l)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ListingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        user={user}
        profile={profile}
        listing={editing}
        onSaved={load}
      />
    </div>
  );
}