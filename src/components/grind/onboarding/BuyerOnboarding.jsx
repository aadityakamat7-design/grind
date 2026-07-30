import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { genInviteCode, calcAge } from "@/lib/grind";
import { redeemReferralCode } from "@/lib/referrals";
import LegalModal from "@/components/grind/LegalModal";

const TERMS_VERSION = "2026-07";

export default function BuyerOnboarding({ user }) {
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [dob, setDob] = useState("");
  const [refCode, setRefCode] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [legalModal, setLegalModal] = useState(null);

  const finish = async () => {
    setSaving(true);
    setGeoError("");
    setAgeError("");

    // Buyers must be 18+ — they're hiring and paying
    const age = calcAge(dob);
    if (age === null || age < 18) {
      setAgeError("You must be at least 18 years old to hire on Kickstart.");
      setSaving(false);
      return;
    }

    const existing = await base44.entities.BuyerProfile.filter({ user_id: user.id });
    if (!existing[0]) {
      let geo;
      try {
        const res = await base44.functions.invoke("geocodeAddress", { query: `${address}, ${zip}` });
        geo = res.data;
      } catch (err) {
        setGeoError(err.response?.data?.error || "Couldn't verify that address. Please check it and try again.");
        setSaving(false);
        return;
      }
      await base44.entities.BuyerProfile.create({
        user_id: user.id,
        full_name: user.full_name || "",
        address,
        zip,
        latitude: geo.lat,
        longitude: geo.lng,
        resolved_city: geo.city,
        state: geo.state,
        referral_code: genInviteCode(),
      });
      if (refCode.trim()) await redeemReferralCode(refCode, user);
    }
    await base44.auth.updateMe({
      app_role: "buyer",
      onboarded: true,
      date_of_birth: dob,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    });
    setSaving(false);
    window.location.href = "/buyer";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Where are you?</h2>
      <p className="text-sm text-muted-foreground">Kickstart is hyperlocal — we'll show you teens in your neighborhood.</p>
      <div>
        <Label>Home address</Label>
        <Input className="rounded-xl mt-1" placeholder="123 Maple St" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <Label>ZIP code</Label>
        <Input className="rounded-xl mt-1" placeholder="e.g. 94110" value={zip} onChange={(e) => setZip(e.target.value)} />
      </div>
      <div>
        <Label>Date of birth</Label>
        <Input type="date" className="rounded-xl mt-1" value={dob} onChange={(e) => setDob(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">You must be 18 or older to hire on Kickstart.</p>
      </div>
      <div>
        <Label>Referral code (optional)</Label>
        <Input className="rounded-xl mt-1" placeholder="Got a code from a friend?" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">You'll both get $10 booking credit after your first completed booking.</p>
      </div>
      {ageError && <p className="text-xs text-destructive font-medium">{ageError}</p>}
      {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>I accept the{" "}
          <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
          {" "}and{" "}
          <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
        </span>
      </label>
      <Button className="w-full rounded-xl" disabled={!address || !zip || !dob || !tosAccepted || saving} onClick={finish}>
        {saving ? "Saving..." : "Get started"}
      </Button>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}