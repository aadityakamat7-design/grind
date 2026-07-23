import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/grind/ResponsiveSelect";
import { AlertTriangle } from "lucide-react";
import { CATEGORIES, checkHazard, MAX_UNIT_PRICE } from "@/lib/grind";

export default function ListingForm({ open, onOpenChange, listing, profile, onSaved }) {
  const [form, setForm] = useState(
    listing || { category: "", title: "", description: "", price_model: "FIXED", price: "" }
  );
  const [hazard, setHazard] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const priceError = Number(form.price) > MAX_UNIT_PRICE ? `Max ${MAX_UNIT_PRICE} per job` : "";

  const save = async () => {
    if (priceError) return;
    const check = checkHazard(`${form.title} ${form.description}`, profile?.age ?? 16);
    if (check.flagged) {
      setHazard(check.reason);
      return;
    }
    setHazard(null);
    setSaving(true);
    try {
      await base44.functions.invoke("saveListing", {
        listingId: listing?.id,
        category: form.category,
        title: form.title.trim(),
        description: form.description.trim(),
        price_model: form.price_model,
        price: Number(form.price),
        zip: profile?.zip || "",
        teenUserId: profile.user_id,
        teenProfileId: profile.id,
        teenDisplayName: profile.display_name,
      });
    } catch (err) {
      setHazard(err.response?.data?.error || "Couldn't save this listing.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{listing ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Category</Label>
            <ResponsiveSelect
              value={form.category}
              onValueChange={(v) => set("category", v)}
              options={CATEGORIES}
              placeholder="Pick a category"
              title="Category"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Title</Label>
            <Input className="rounded-xl mt-1" maxLength={80} placeholder="e.g. Algebra tutoring after school" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="rounded-xl mt-1" maxLength={1000} placeholder="What do you offer? What should neighbors expect?" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pricing</Label>
              <ResponsiveSelect
                value={form.price_model}
                onValueChange={(v) => set("price_model", v)}
                options={[{ value: "FIXED", label: "Fixed price" }, { value: "HOURLY", label: "Per hour" }]}
                title="Pricing"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input type="number" min="1" max={MAX_UNIT_PRICE} className="rounded-xl mt-1" value={form.price} onChange={(e) => set("price", e.target.value)} />
              {priceError && <p className="text-xs text-rose-600 mt-1 font-semibold">{priceError}</p>}
            </div>
          </div>
          {hazard && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p><span className="font-semibold">Safety check:</span> {hazard} Please adjust your listing.</p>
            </div>
          )}
          <Button
            className="w-full rounded-xl"
            disabled={!form.category || !form.title || !form.price || !!priceError || saving}
            onClick={save}
          >
            {saving ? "Saving..." : listing ? "Save changes" : "Publish service"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}