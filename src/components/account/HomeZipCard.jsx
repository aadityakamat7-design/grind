import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MapPin } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";

// A teen's (or independent's) home ZIP code. Verified server-side against
// California, and re-geocoded because it decides which jobs count as nearby.
// A teen under 18 has their parent told.
export default function HomeZipCard({ data, onSaved }) {
  const { toast } = useToast();
  const teen = data.profile?.teen || {};
  const [zip, setZip] = useState(teen.zip || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await callAccountFunction("accountProfile", { home_zip: zip });
      const notes = (res?.notices || []).join(" ");
      toast({ title: "ZIP code updated", description: notes || "Nearby jobs are matched from your new home ZIP." });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={MapPin} title="Home ZIP code" description="Only your city is ever shown publicly. Changing this changes which jobs count as nearby.">
      <div className="rounded-xl bg-secondary p-3.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Current</p>
        <p className="text-sm font-semibold text-foreground">
          {teen.zip ? `${teen.zip}${teen.city ? ` · ${teen.city}` : ""}` : "Not set"}
        </p>
        {teen.parent?.name && <p className="text-[11px] text-muted-foreground mt-1">Linked to {teen.parent.name}</p>}
      </div>
      <div>
        <Label htmlFor="home_zip">New ZIP code</Label>
        <Input
          id="home_zip"
          className="rounded-xl mt-1"
          inputMode="numeric"
          maxLength={5}
          placeholder="94539"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          California only. {teen.is_minor ? "Your parent will be told when you change this." : ""}
        </p>
      </div>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      <Button className="w-full rounded-full" disabled={saving || zip.length !== 5 || zip === teen.zip} onClick={save}>
        {saving ? "Checking…" : "Update ZIP code"}
      </Button>
    </SectionCard>
  );
}