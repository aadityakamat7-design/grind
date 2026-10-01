import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { calcAge } from "@/lib/grind";
import { ShieldCheck } from "lucide-react";
import LegalModal from "@/components/grind/LegalModal";
import WaitlistCapture from "@/components/grind/WaitlistCapture";
import { seededName, isRealName, isCaliforniaZip } from "@/lib/signupState";

const TERMS_VERSION = "2026-07";

export default function BuyerOnboarding({ user }) {
  // Names are only ever seeded from a real name already on the account — never
  // from the email username the platform writes at sign-up.
  const seeded = seededName(user);
  const [firstName, setFirstName] = useState(seeded.split(" ")[0] || "");
  const [lastName, setLastName] = useState(seeded.split(" ").slice(1).join(" "));
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [dob, setDob] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [caBlocked, setCaBlocked] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [legalModal, setLegalModal] = useState(null);
  const [done, setDone] = useState(false);

  const finish = async () => {
    setSaving(true);
    setGeoError("");
    setAgeError("");

    if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
      setAgeError("Enter your first and last name — letters only, and not your email address.");
      setSaving(false);
      return;
    }
    if (!isCaliforniaZip(zip)) {
      setGeoError("Enter a 5-digit California ZIP code.");
      setSaving(false);
      return;
    }

    // Buyers must be 18+ — they're hiring and paying
    const age = calcAge(dob);
    if (age === null || age < 18) {
      setAgeError("You must be at least 18 years old to hire on Blockwork.");
      setSaving(false);
      return;
    }

    const existing = await base44.entities.BuyerProfile.filter({ user_id: user.id });
    if (!existing[0]) {
      let geo;
      try {
        const res = await base44.functions.invoke("geocodeAddress", { query: `${address}, ${zip.trim()}` });
        geo = res.data;
      } catch (err) {
        const errorMsg = err.response?.data?.error || "Couldn't verify that address. Please check it and try again.";
        setGeoError(errorMsg);
        setCaBlocked(errorMsg.includes("California"));
        setSaving(false);
        return;
      }
      await base44.entities.BuyerProfile.create({
        user_id: user.id,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        address,
        zip,
        latitude: geo.lat,
        longitude: geo.lng,
        resolved_city: geo.city,
        state: geo.state,
      });
    }
    // The server re-checks the role, age and California ZIP before granting
    // app_role — the browser can't assign itself a role.
    const roleRes = await base44.functions.invoke("saveSignupRole", {
      role: "buyer",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob,
      zip: zip.trim(),
    });
    if (roleRes.data?.error) {
      setAgeError(roleRes.data.error);
      setSaving(false);
      return;
    }
    await base44.auth.updateMe({
      phone: phone.trim(),
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    });
    setSaving(false);
    setDone(true);
  };

  if (done)
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You're all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your account is ready. Browse trusted local teens and post your first job whenever you need help.
        </p>
        <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/buyer"; }}>
          Go to dashboard
        </Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Where are you?</h2>
      <p className="text-sm text-muted-foreground">Blockwork is hyperlocal — we'll show you teens in your neighborhood. Currently available in California only.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label>First name</Label>
          <Input className="rounded-xl mt-1" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="min-w-0">
          <Label>Last name</Label>
          <Input className="rounded-xl mt-1" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Home address</Label>
        <Input className="rounded-xl mt-1" placeholder="123 Maple St" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <Label>California ZIP code</Label>
        <Input
          className="rounded-xl mt-1"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="5-digit ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div>
        <Label>Phone (optional)</Label>
        <Input className="rounded-xl mt-1" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <Label>Date of birth</Label>
        <Input
          type="date"
          className="rounded-xl mt-1"
          max={new Date().toISOString().split("T")[0]}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">You must be 18 or older to hire on Blockwork.</p>
      </div>
      {ageError && <p className="text-xs text-destructive font-medium">{ageError}</p>}
      {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
      {caBlocked && <WaitlistCapture state="" role="buyer" />}
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
        <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" />
        <span>I accept the{" "}
          <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
          {" "}and{" "}
          <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
        </span>
      </label>
      <Button className="w-full rounded-xl" disabled={!firstName || !lastName || !address || zip.length !== 5 || !dob || !tosAccepted || saving} onClick={finish}>
        {saving ? "Saving..." : "Get started"}
      </Button>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}