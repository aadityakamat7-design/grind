import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Save, MapPin, AlertCircle } from "lucide-react";

// Role-aware profile editor. Only exposes fields the owner is allowed to
// update (RLS-enforced server-side). Address/ZIP changes are re-geocoded so
// distance matching and state labor-law checks stay accurate.
export default function ProfileSettingsCard({ user }) {
  const { toast } = useToast();
  const role = user.app_role;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [form, setForm] = useState({});
  const [origZip, setOrigZip] = useState("");
  const [origAddress, setOrigAddress] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (role === "buyer") {
          const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
          const p = profiles[0] || {};
          setForm({
            full_name: p.full_name || user.full_name || "",
            address: p.address || "",
            zip: p.zip || "",
            description: p.description || "",
          });
          setOrigAddress(p.address || "");
          setOrigZip(p.zip || "");
        } else if (role === "parent") {
          const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
          const p = profiles[0] || {};
          setForm({
            full_name: p.full_name || user.full_name || "",
            phone: p.phone || "",
          });
        } else if (role === "teen") {
          const [profiles, privates] = await Promise.all([
            base44.entities.TeenProfile.filter({ user_id: user.id }),
            base44.entities.TeenPrivateData.filter({ user_id: user.id }),
          ]);
          const p = profiles[0] || {};
          const pd = privates[0] || {};
          setForm({
            display_name: p.display_name || "",
            bio: p.bio || "",
            skills: (p.skills || []).join(", "),
            service_radius_miles: p.service_radius_miles ?? 3,
            is_available: p.is_available !== false,
            zip: pd.zip || "",
            date_of_birth: pd.date_of_birth || "",
          });
          setOrigZip(pd.zip || "");
        }
      } catch (err) {
        console.error("Profile load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id, role]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setGeoError("");
    try {
      if (role === "buyer") {
        const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
        const p = profiles[0];
        if (!p) return;
        const addressChanged = form.address !== origAddress || form.zip !== origZip;
        let geo = null;
        if (addressChanged && form.address && form.zip) {
          try {
            const res = await base44.functions.invoke("geocodeAddress", { query: `${form.address}, ${form.zip}` });
            geo = res.data;
          } catch (err) {
            setGeoError(err.response?.data?.error || "Couldn't verify that address. Please check it and try again.");
            setSaving(false);
            return;
          }
        }
        const update = {
          full_name: form.full_name,
          address: form.address,
          zip: form.zip,
          description: form.description,
        };
        if (geo) {
          update.latitude = geo.lat;
          update.longitude = geo.lng;
          update.resolved_city = geo.city;
          update.state = geo.state;
        }
        await base44.entities.BuyerProfile.update(p.id, update);
        setOrigAddress(form.address);
        setOrigZip(form.zip);
      } else if (role === "parent") {
        const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
        const p = profiles[0];
        if (!p) return;
        await base44.entities.ParentProfile.update(p.id, {
          full_name: form.full_name,
          phone: form.phone,
        });
      } else if (role === "teen") {
        const [profiles, privates] = await Promise.all([
          base44.entities.TeenProfile.filter({ user_id: user.id }),
          base44.entities.TeenPrivateData.filter({ user_id: user.id }),
        ]);
        const p = profiles[0];
        const pd = privates[0];
        if (!p) return;
        await base44.entities.TeenProfile.update(p.id, {
          display_name: form.display_name,
          bio: form.bio,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          service_radius_miles: Number(form.service_radius_miles) || 3,
          is_available: form.is_available,
        });
        if (pd) {
          const zipChanged = form.zip !== origZip;
          let geo = null;
          if (zipChanged && form.zip) {
            try {
              const res = await base44.functions.invoke("geocodeAddress", { query: form.zip });
              geo = res.data;
            } catch (err) {
              setGeoError(err.response?.data?.error || "Couldn't verify that ZIP. Please check it and try again.");
              setSaving(false);
              return;
            }
          }
          const pdUpdate = { zip: form.zip, date_of_birth: form.date_of_birth };
          if (geo) {
            pdUpdate.latitude = geo.lat;
            pdUpdate.longitude = geo.lng;
          }
          await base44.entities.TeenPrivateData.update(pd.id, pdUpdate);
          if (geo) {
            await base44.entities.TeenProfile.update(p.id, {
              resolved_city: geo.city,
              state: geo.state,
            });
          }
          setOrigZip(form.zip);
        }
      }
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err) {
      toast({ title: "Couldn't save", description: err.response?.data?.error || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
        <div className="h-5 w-32 rounded-lg skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Save className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Profile settings</h2>
      </div>

      {role === "buyer" && (
        <>
          <Field label="Full name">
            <Input className="rounded-xl" value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Home address" hint="Used to match you with nearby teens. Re-verified when changed.">
            <Input className="rounded-xl" value={form.address || ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="ZIP code">
            <Input className="rounded-xl" value={form.zip || ""} onChange={(e) => set("zip", e.target.value)} />
          </Field>
          <Field label="About you (optional)">
            <Textarea className="rounded-xl" rows={3} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </>
      )}

      {role === "parent" && (
        <>
          <Field label="Full name">
            <Input className="rounded-xl" value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Phone number" hint="Used for safety and account recovery.">
            <Input className="rounded-xl" type="tel" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </>
      )}

      {role === "teen" && (
        <>
          <Field label="Display name" hint="First name + last initial only — visible to neighbors.">
            <Input className="rounded-xl" value={form.display_name || ""} onChange={(e) => set("display_name", e.target.value)} />
          </Field>
          <Field label="Bio">
            <Textarea className="rounded-xl" rows={3} value={form.bio || ""} onChange={(e) => set("bio", e.target.value)} />
          </Field>
          <Field label="Skills" hint="Comma-separated, e.g. Math, Lawn care, Dog walking">
            <Input className="rounded-xl" value={form.skills || ""} onChange={(e) => set("skills", e.target.value)} />
          </Field>
          <Field label="Service radius (miles)">
            <Input className="rounded-xl" type="number" min="1" max="25" value={form.service_radius_miles ?? ""} onChange={(e) => set("service_radius_miles", e.target.value)} />
          </Field>
          <Field label="ZIP code" hint="Your location is never shared — only your city is shown. Re-verified when changed.">
            <Input className="rounded-xl" value={form.zip || ""} onChange={(e) => set("zip", e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-secondary p-3.5">
            <div>
              <p className="text-sm font-medium text-foreground">Available for work</p>
              <p className="text-xs text-muted-foreground">Toggle off to hide yourself from neighbor search.</p>
            </div>
            <Switch checked={form.is_available} onCheckedChange={(v) => set("is_available", v)} />
          </div>
        </>
      )}

      {geoError && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {geoError}
        </div>
      )}

      {(role === "buyer" || role === "parent" || role === "teen") && (
        <Button className="w-full rounded-full" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0 opacity-0" />
          {hint}
        </p>
      )}
    </div>
  );
}