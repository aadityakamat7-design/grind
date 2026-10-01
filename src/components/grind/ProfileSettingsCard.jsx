import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Save, Info } from "lucide-react";
import SkillPicker from "@/components/grind/SkillPicker";
import { callAccountFunction } from "@/lib/accountApi";

// The public-profile extras that Account information doesn't cover: a teen's
// skills and the neighbor / parent "about you" line. Saved through the server
// like the rest of the account screens.
export default function ProfileSettingsCard({ user }) {
  const { toast } = useToast();
  const role = user.app_role;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        if (role === "teen") {
          const profiles = await base44.entities.TeenProfile.filter({ user_id: user.id });
          setSkills(profiles[0]?.skills || []);
        } else if (role === "parent") {
          const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
          setDescription(profiles[0]?.description || "");
        } else if (role === "buyer") {
          const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
          setDescription(profiles[0]?.description || "");
        }
      } catch (err) {
        console.error("Public profile load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id, role]);

  if (role !== "teen" && role !== "parent" && role !== "buyer") return null;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await callAccountFunction("accountProfile", role === "teen" ? { skills } : { description });
      toast({ title: "Saved", description: "Your public profile is updated." });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
        <div className="h-5 w-32 rounded-lg skeleton-shimmer" />
        <div className="h-11 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Save className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">{role === "teen" ? "Skills" : "About you"}</h2>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Your name, photo, phone, email, addresses and notifications live in Account information.
      </p>

      {role === "teen" ? (
        <div>
          <Label>Skills</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">Pick from popular services or add your own.</p>
          <SkillPicker value={Array.isArray(skills) ? skills : []} onChange={setSkills} />
        </div>
      ) : (
        <div>
          <Label>{role === "parent" ? "About you" : "About you (optional)"}</Label>
          <Textarea
            className="rounded-xl mt-1"
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button className="w-full rounded-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}