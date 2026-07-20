import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, checkHazards, calcAge } from "@/lib/grind";
import { AlertTriangle } from "lucide-react";

const EMPTY = { category: "", title: "", description: "", price_model: "FIXED", price: "" };

export default function ListingForm({ open, onOpenChange, user, profile, listing, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [hazards, setHazards] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm(listing ? {
        category: listing.category, title: listing.title, description: listing.description || "",
        price_model: listing.price_model, price: String(listing.price),
      } : EMPTY);
      setError("");
      setHazards([]);
    }
  }, [open, listing]);

  const submit = async () => {
    setError("");
    if (!form.category || !form.title || !form.price) { setError("Category, title, and price are required."); return; }

    // Task-safety check
    const found = checkHazards(`${form.title} ${form.description}`);
    const age = calcAge(profile?.date_of_birth);
    const underAgeMower = age !== null && age < 16 && `${form.title} ${form.description}`.toLowerCase().includes("mow");
    if (found.length > 0) {
      setHazards(found);
      setError("This listing describes a task that isn't allowed for minors (hazardous work rules). Please remove it.");
      return;
    }
    if (underAgeMower) {
      setHazards(["power mower (under 16)"]);
      setError("Power mowing equipment isn't allowed for teens under 16. You can offer raking, weeding, or watering instead.");
      return;
    }

    setSaving(true);
    const data = {
      teen_user_id: user.id,
      teen_display_name: profile?.display_name,
      category: form.category,
      title: form.title,
      description: form.description,
      price_model: form.price_model,
      price: Number(form.price),
      zip: profile?.zip,
      is_hazard_flagged: false,
      status: "published",
    };
    if (listing) await base44.entities.Listing.update(listing.id, data);
    else await base44.entities.Listing.create(data);
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{listing ? "Edit listing" : "New listing"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Dog walking after school" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What exactly do you offer?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pricing</Label>
              <Select value={form.price_model} onValueChange={(v) => set("price_model", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed price</SelectItem>
                  <SelectItem value="HOURLY">Per hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input type="number" min="1" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="20" />
            </div>
          </div>

          {hazards.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">Blocked terms: {hazards.join(", ")}</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full rounded-full h-11" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : listing ? "Save changes" : "Publish listing"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            All listings pass a task-safety check — hazardous tasks (power tools, ladders, roofing, driving) are blocked for minors.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}