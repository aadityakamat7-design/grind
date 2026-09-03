import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, List, Pause, Play, Pencil, Trash2 } from "lucide-react";
import ListingForm from "@/components/grind/ListingForm";
import StatusBadge from "@/components/grind/StatusBadge";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import { toast } from "@/components/ui/use-toast";
import ErrorRetry from "@/components/grind/ErrorRetry";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TeenListings() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [profiles, myListings] = await Promise.all([
        base44.entities.TeenProfile.filter({ user_id: user.id }),
        base44.entities.Listing.filter({ teen_user_id: user.id }, "-created_date"),
      ]);
      setProfile(profiles[0] || null);
      setListings(myListings);
    } catch (err) {
      console.error("TeenListings load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const togglePause = async (l) => {
    try {
      await base44.entities.Listing.update(l.id, { status: l.status === "paused" ? "published" : "paused" });
      load();
    } catch (err) {
      toast({ title: "Couldn't update listing", description: err.response?.data?.error || "Something went wrong.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.Listing.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast({ title: "Couldn't delete listing", description: err.response?.data?.error || "Something went wrong.", variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-muted skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-24 skeleton-shimmer" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-4 h-20 skeleton-shimmer" />)}
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const canPublish = !!profile && profile.status !== "suspended";

  return (
    <div className="space-y-5">
      <PageHeader title="My services" subtitle="Manage the skills you offer to neighbors.">
        <Button className="rounded-full" disabled={!canPublish} onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> New
        </Button>
      </PageHeader>

      {listings.length === 0 ? (
        <EmptyState icon={List} title="No services yet" subtitle="List a skill you already have — tutoring, lawn care, pet sitting, tech help..." />
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{CATEGORY_LABELS[l.category]}</p>
                  <h3 className="font-bold text-foreground mt-0.5 text-[15px]">{l.title}</h3>
                </div>
                <p className="font-extrabold text-foreground shrink-0 text-[15px]">
                  {money(l.price)}
                  <span className="text-[11px] text-muted-foreground font-medium">{l.price_model === "HOURLY" ? "/hr" : ""}</span>
                </p>
              </div>
              <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2">{l.description}</p>
              <div className="flex items-center justify-between mt-3.5">
                <StatusBadge status={l.status} />
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => { setEditing(l); setFormOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => togglePause(l)}>
                    {l.status === "paused" ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(l)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}