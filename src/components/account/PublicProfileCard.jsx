import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Info } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";

const BIO_MAX = 300;

// The public-facing part of a teen's (or independent's) profile: About me,
// whether they are taking work, and how far they'll travel. Contact details,
// links, addresses and school names are blocked on the server with a clear
// reason. Photo and About me changes notify the parent.
export default function PublicProfileCard({ data, onSaved }) {
  const { toast } = useToast();
  const teen = data.profile?.teen || {};
  const [bio, setBio] = useState(teen.bio || "");
  const [available, setAvailable] = useState(teen.is_available !== false);
  const [radius, setRadius] = useState(teen.service_radius_miles ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await callAccountFunction("accountProfile", {
        bio,
        is_available: available,
        service_radius_miles: Number(radius) || 3,
      });
      const notes = (res?.notices || []).join(" ");
      toast({ title: "Profile saved", description: notes || "Your public profile is updated." });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={Sparkles} title="About me and availability" description="This is what neighbors see on your public profile.">
      <div>
        <Label htmlFor="bio">About me</Label>
        <Textarea
          id="bio"
          rows={4}
          className="rounded-xl mt-1"
          placeholder="I mow lawns and wash cars in the neighborhood. Weekends work best."
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          {bio.length}/{BIO_MAX} · No phone numbers, emails, links, social handles, addresses or school names.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-secondary p-3.5">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] font-medium text-foreground">Available for work</p>
          <p className="text-[11px] text-muted-foreground">Off hides you from neighbor search.</p>
        </div>
        <Switch checked={available} onCheckedChange={setAvailable} />
      </div>

      <div>
        <Label htmlFor="radius">How far I'll travel (miles)</Label>
        <Input
          id="radius"
          type="number"
          min="1"
          max="25"
          className="rounded-xl mt-1"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          A parent's distance limit, if they set one, always wins over this.
        </p>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button className="w-full rounded-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </SectionCard>
  );
}