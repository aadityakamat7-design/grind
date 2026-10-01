import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Plus, Star, Pencil, Trash2, X } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";

const EMPTY = { id: "", label: "", address: "", zip: "", job_notes: "", is_default: false };

// A neighbor's saved addresses. Every address is verified against California on
// the server, job notes stay hidden until a booking is approved, and an address
// an upcoming booking is using can't be removed.
export default function AddressBookCard({ data, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const addresses = data.addresses || [];

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await callAccountFunction("savedAddress", {
        action: "save",
        id: form.id || undefined,
        label: form.label,
        address: form.address,
        zip: form.zip,
        job_notes: form.job_notes,
        is_default: !!form.is_default,
      });
      toast({ title: form.id ? "Address updated" : "Address saved" });
      setForm(null);
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (row) => {
    setBusyId(row.id);
    try {
      await callAccountFunction("savedAddress", { action: "set_default", id: row.id });
      toast({ title: `${row.label} is now your default address` });
      onSaved?.();
    } catch (err) {
      toast({ title: "Couldn't change that", description: err.message, variant: "destructive" });
    } finally {
      setBusyId("");
    }
  };

  const remove = async (row) => {
    setBusyId(row.id);
    try {
      await callAccountFunction("savedAddress", { action: "delete", id: row.id });
      toast({ title: "Address removed" });
      onSaved?.();
    } catch (err) {
      toast({
        title: err.code === "address_in_use" ? "This address is in use" : "Couldn't remove that",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setBusyId("");
    }
  };

  return (
    <SectionCard
      icon={MapPin}
      title="Saved addresses"
      description="Add, edit and choose a default. Changing or removing an address never moves a booked job."
    >
      {!addresses.length && !form && (
        <p className="text-[13px] text-muted-foreground">
          No saved addresses yet. Add one so booking a job takes a tap.
        </p>
      )}

      <div className="space-y-2.5">
        {addresses.map((row) => (
          <div key={row.id} className="rounded-xl border border-border p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {row.label}
                  {row.is_default && <Badge className="rounded-full text-[10px] px-2">Default</Badge>}
                </p>
                <p className="text-[12px] text-muted-foreground break-words">
                  {row.address}{row.zip ? `, ${row.zip}` : ""}{row.city ? ` · ${row.city}` : ""}
                </p>
                {row.job_notes && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <span className="font-semibold">Job notes:</span> {row.job_notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!row.is_default && (
                <Button variant="outline" size="sm" className="rounded-full h-8" disabled={busyId === row.id} onClick={() => makeDefault(row)}>
                  <Star className="w-3.5 h-3.5 mr-1.5" /> Make default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8"
                onClick={() => setForm({ id: row.id, label: row.label, address: row.address, zip: row.zip, job_notes: row.job_notes || "", is_default: !!row.is_default })}
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                disabled={busyId === row.id}
                onClick={() => remove(row)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      {form ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{form.id ? "Edit address" : "Add an address"}</p>
            <button onClick={() => { setForm(null); setError(""); }} aria-label="Close" className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div>
            <Label>Label</Label>
            <Input className="rounded-xl mt-1" placeholder="Home" value={form.label} onChange={(e) => set("label", e.target.value)} />
          </div>
          <div>
            <Label>Street address</Label>
            <Input className="rounded-xl mt-1" placeholder="1234 Main St" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label>ZIP code</Label>
            <Input className="rounded-xl mt-1" inputMode="numeric" maxLength={5} placeholder="94539" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">California only — we check the address on our side.</p>
          </div>
          <div>
            <Label>Job notes (optional)</Label>
            <Input className="rounded-xl mt-1" placeholder="Gate code, pets, parking" value={form.job_notes} onChange={(e) => set("job_notes", e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Only shown to the teen and their parent after a booking is approved.</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary p-3.5">
            <p className="text-[13px] font-medium text-foreground">Use as my default address</p>
            <Switch checked={!!form.is_default} onCheckedChange={(v) => set("is_default", v)} />
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <div className="flex gap-2.5">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => { setForm(null); setError(""); }} disabled={saving}>
              Cancel
            </Button>
            <Button className="flex-1 rounded-full" onClick={save} disabled={saving || !form.address || form.zip.length !== 5}>
              {saving ? "Checking…" : "Save address"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full rounded-full" onClick={() => { setForm({ ...EMPTY, is_default: !addresses.length }); setError(""); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Add an address
        </Button>
      )}
    </SectionCard>
  );
}