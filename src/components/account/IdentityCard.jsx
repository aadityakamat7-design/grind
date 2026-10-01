import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { UserRound, Camera, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { Image } from "@/components/ui/image";
import { uploadPhoto } from "@/lib/imageProcessing";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";
import SquareCropDialog from "@/components/account/SquareCropDialog";

// Name, photo and phone — the parts of an account everyone owns, whatever
// their role. A parent's or teen's legal name also has to match the name their
// payouts are verified under, so that has to be confirmed explicitly.
export default function IdentityCard({ data, role, onSaved }) {
  const { toast } = useToast();
  const [name, setName] = useState(data.identity.full_name || "");
  const [phone, setPhone] = useState(data.identity.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needMatch, setNeedMatch] = useState(false);
  const [matchOk, setMatchOk] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  const photo = data.identity.photo_url || data.profile?.teen?.photo_url || "";
  const stripeName = data.payout?.stripe_name || "";
  const initials = (data.identity.full_name || data.identity.signin_email || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const isPayoutRole = role === "parent" || role === "teen";

  const save = async (extra = {}) => {
    setSaving(true);
    setError("");
    try {
      const res = await callAccountFunction("accountProfile", {
        full_name: name,
        phone,
        ...extra,
      });
      const extraNotes = (res?.notices || []).join(" ");
      toast({ title: "Details saved", description: extraNotes || "Your changes are live." });
      setNeedMatch(false);
      setMatchOk(false);
      onSaved?.();
    } catch (err) {
      if (err.code === "payout_name_match") {
        setNeedMatch(true);
        setError("Your legal name must match your payout account.");
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCrop = async (cropped) => {
    setCropFile(null);
    setPhotoBusy(true);
    setError("");
    try {
      const url = await uploadPhoto(cropped);
      await callAccountFunction("accountProfile", { photo_url: url });
      toast({ title: "Photo updated", description: role === "teen" ? "Your parent was told about the change." : "Your new photo is saved." });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setError("");
    try {
      await callAccountFunction("accountProfile", { photo_url: "" });
      toast({ title: "Photo removed" });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <SectionCard icon={UserRound} title="Name and photo" description="Your name is shown publicly as your first name and last initial.">
      <div className="flex items-center gap-4">
        {photo ? (
          <Image src={photo} alt="" className="w-20 h-20 rounded-2xl shrink-0" fittingType="fill" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }}
          />
          <button
            type="button"
            disabled={photoBusy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            {photoBusy ? "Uploading…" : photo ? "Change photo" : "Add photo"}
          </button>
          {photo && !photoBusy && (
            <button
              type="button"
              onClick={removePhoto}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" /> Remove photo
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">Images only, up to 5MB. Cropped square, and location data is removed.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="full_name">First and last name</Label>
        <Input id="full_name" className="rounded-xl mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>

      <div>
        <Label htmlFor="phone">Phone number (optional)</Label>
        <Input id="phone" type="tel" className="rounded-xl mt-1" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <p className="text-[11px] text-muted-foreground mt-1">Used for account recovery and safety. Never shown publicly.</p>
      </div>

      {isPayoutRole && stripeName && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-1.5">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Your legal name must match your payout account
          </p>
          <p className="text-[11px] text-amber-700/90">
            Stripe has <span className="font-semibold">{stripeName}</span> on file. If your name changed, update it in Stripe as well, or payouts can be held.
          </p>
          <a
            href={role === "parent" ? "/parent/payouts" : "/teen/wallet"}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Update it in Stripe <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {needMatch && (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary p-3.5">
          <p className="text-xs text-foreground font-medium">My legal name still matches my payout account.</p>
          <Switch checked={matchOk} onCheckedChange={setMatchOk} />
        </div>
      )}

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button
        className="w-full rounded-full"
        disabled={saving || (needMatch && !matchOk)}
        onClick={() => save(needMatch || matchOk ? { confirm_payout_name_match: true } : {})}
      >
        {saving ? "Saving…" : "Save name and phone"}
      </Button>

      {cropFile && (
        <SquareCropDialog file={cropFile} onCancel={() => setCropFile(null)} onCrop={handleCrop} />
      )}
    </SectionCard>
  );
}