import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, List, Pause, Play, Pencil, Trash2 } from "lucide-react";
import ListingForm from "@/components/grind/ListingForm";
import StatusBadge from "@/components/grind/StatusBadge";
import EmptyState from "@/components/grind/EmptyState";
import { CATEGORY_LABELS, money } from "@/lib/grind";

export default function TeenListings() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [profiles, myListings] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: user.id }),
      base44.entities.Listing.filter({ teen_user_id: user.id }, "-created_date"),
    ]);
    setProfile(profiles[0] || null);
    setListings(myListings);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const togglePause = async (l) => {
    await base44.entities.Listing.update(l.id, { status: l.status === "paused" ? "published" : "paused" });
    load();
  };

  const remove = async (l) => {
    await base44.entities.Listing.delete(l.id);
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const canPublish = profile?.status === "active";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">My services</h1>
        <Button className="rounded-xl" disabled={!canPublish} onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New
        </Button>
      </div>

      {!canPublish && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          You can create services once your parent approves your account.
        </p>
      )}

      {listings.length === 0 ? (
        <EmptyState icon={List} title="No services yet" subtitle="List a skill you already have — tutoring, lawn care, pet sitting, tech help..." />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{CATEGORY_LABELS[l.category]}</p>
                  <h3 className="font-bold text-slate-900 mt-0.5">{l.title}</h3>
                </div>
                <p className="font-extrabold text-slate-900 shrink-0">
                  {money(l.price)}
                  <span className="text-[11px] text-slate-400 font-medium">{l.price_model === "HOURLY" ? "/hr" : ""}</span>
                </p>
              </div>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{l.description}</p>
              <div className="flex items-center justify-between mt-3">
                <StatusBadge status={l.status} />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => { setEditing(l); setFormOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => togglePause(l)}>
                    {l.status === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => remove(l)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ListingForm
          key={editing?.id || "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          listing={editing}
          profile={profile}
          onSaved={load}
        />
      )}
    </div>
  );
}