import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { genInviteCode } from "@/lib/grind";
import { redeemReferralCode } from "@/lib/referrals";

// Neighbors (buyers) do not go through identity verification — they can sign
// up, post jobs, and hire teens without an ID check. Only the address is
// needed to match them with local teens.
export default function BuyerOnboarding({ user }) {
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [refCode, setRefCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");

  const finish = async () => {
    setSaving(true);
    setGeoError("");
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
    await base44.auth.updateMe({ app_role: "buyer", onboarded: true });
    setSaving(false);
    // Hard redirect so the freshly-set role is picked up
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
        <Label>Referral code (optional)</Label>
        <Input className="rounded-xl mt-1" placeholder="Got a code from a friend?" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
        <p className="text-xs text-muted-foreground mt-1">You'll both get $10 booking credit after your first completed booking.</p>
      </div>
      {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
      <Button className="w-full rounded-xl" disabled={!address || !zip || saving} onClick={finish}>
        {saving ? "Saving..." : "Get started"}
      </Button>
    </div>
  );
}