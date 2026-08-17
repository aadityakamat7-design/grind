import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/grind/ResponsiveSelect";
import { AlertTriangle } from "lucide-react";
import { checkHazard, MAX_UNIT_PRICE, SKILL_CATEGORIES } from "@/lib/grind";
import { getMinAgeForCategory } from "@/lib/stateWorkRules";
import CredentialUpload from "@/components/grind/CredentialUpload";
import SlideToConfirm from "@/components/grind/SlideToConfirm";
import CategoryPicker from "@/components/grind/CategoryPicker";

export default function ListingForm({ open, onOpenChange, listing, profile, onSaved }) {
  const [form, setForm] = useState(
    listing || { category: "", title: "", description: "", price_model: "FIXED", price: "" }
  );
  const [hazard, setHazard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [credential, setCredential] = useState(null);
  const [teenAge, setTeenAge] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const priceError = Number(form.price) > MAX_UNIT_PRICE ? `Max ${MAX_UNIT_PRICE} per job` : "";

  // Fetch the teen's verified age so we can show locked categories. The
  // server re-checks with the verified DOB on save — this is just for UI.
  useEffect(() => {
    if (!open) return;
    base44.entities.TeenPrivateData.filter({ user_id: profile?.user_id }).then((recs) => {
      const pd = recs[0];
      if (!pd) return;
      const dob = pd.verified_dob || pd.date_of_birth;
      if (!dob) return;
      const birth = new Date(dob);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      setTeenAge(age);
    });
  }, [open, profile?.user_id]);

  const categoryMinAge = getMinAgeForCategory(profile?.state, form.category);
  const categoryLocked = teenAge != null && teenAge < categoryMinAge;

  const save = async () => {
    if (priceError) return;
    const check = checkHazard(`${form.title} ${form.description}`, profile?.age ?? 16);
    if (check.flagged) {
      setHazard(check.reason);
      return;
    }
    setHazard(null);
    if (categoryLocked) {
      setHazard(`This category requires age ${categoryMinAge}+ in your state. You'll be eligible when you turn ${categoryMinAge}.`);
      return;
    }
    setSaving(true);
    let res;
    try {
      res = await base44.functions.invoke("saveListing", {
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
    // After the listing is saved, optionally upload a credential proof file
    // and create a Credential record (starts as pending admin review).
    const newListingId = res?.listing?.id || listing?.id;
    if (credential?.file && credential.label && newListingId) {
      try {
        const uploadRes = await base44.integrations.Core.UploadFile({ file: credential.file });
        await base44.functions.invoke("createCredential", {
          listingId: newListingId,
          label: credential.label,
          fileUrl: uploadRes.file_url,
          category: form.category,
          teenDisplayName: profile.display_name,
          listingTitle: form.title.trim(),
        });
      } catch (credErr) {
        console.error("credential upload failed:", credErr);
      }
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
            <CategoryPicker
              value={form.category}
              onChange={(v) => set("category", v)}
              state={profile?.state}
              age={teenAge}
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
          {SKILL_CATEGORIES.includes(form.category) && (
            <CredentialUpload listingId={listing?.id} onChange={setCredential} />
          )}
          <SlideToConfirm
            label={listing ? "Slide to save changes" : "Slide to post"}
            loadingLabel="Saving..."
            loading={saving}
            disabled={!form.category || !form.title || !form.price || !!priceError || categoryLocked}
            onConfirm={save}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}