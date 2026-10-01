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

const TERMS_VERSION = "2026-10-01";

export default function BuyerOnboarding({ user, onProfileSaved }) {
  // The date of birth was checked and saved on the account by the age screen.
  const dob = user.date_of_birth || "";
  // Names are only ever seeded from a real name already on the account — never
  // from the email username the platform writes at sign-up.
  const seeded = seededName(user);
  const [firstName, setFirstName] = useState(seeded.split(" ")[0] || "");
  const [lastName, setLastName] = useState(seeded.split(" ").slice(1).join(" "));
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [caBlocked, setCaBlocked] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [legalModal, setLegalModal] = useState(null);

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

    // Age is checked by the age screen (and again server-side) before an account
    // can be created, so buyers reach here already 18+.
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
    // Record the acceptance itself, as a ConsentRecord — that record (not the
    // stamp above) is what the re-acceptance check reads. Signing up means
    // accepting the current Terms, so nobody leaves onboarding needing the
    // "Updated Terms" pop-up.
    try {
      await base44.functions.invoke("acceptTerms", {
        accepted: true,
        userAgent: navigator.userAgent,
      });
    } catch (err) {
      setAgeError(err?.response?.data?.error || "Couldn't save your Terms acceptance. Please try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    // The server now knows this account is finished; Onboarding reloads it and
    // sends the person to their dashboard.
    onProfileSaved();
  };

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
      {ageError && <p className="text-xs text-destructive font-medium" role="alert">{ageError}</p>}
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
      <Button className="w-full h-12 font-medium" disabled={!firstName || !lastName || !address || zip.length !== 5 || !tosAccepted || saving} onClick={finish}>
        {saving ? "Saving..." : "Get started"}
      </Button>
      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </div>
  );
}