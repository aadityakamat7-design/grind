import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { calcAge, genInviteCode } from "@/lib/grind";
import SkillPicker from "@/components/grind/SkillPicker";
import { checkEligibility, stateName } from "@/lib/stateWorkRules";
import { seededName, isRealName, isCaliforniaZip } from "@/lib/signupState";

// Teen sign-up, step 2 — the profile. The role, date of birth and state were
// already checked and saved on the account by the age screen (claimSignup), so
// nothing is asked again or taken from the browser.
//
// 18+ teens are activated here as independent workers (no parent link). A minor
// finishes this step, then hands their code to a parent on the next screen — the
// parent must link before anything goes live.
export default function TeenOnboarding({ user, onProfileSaved }) {
  const dob = user.date_of_birth || "";
  const usState = user.work_state || "CA";
  const seeded = seededName(user);
  const [firstName, setFirstName] = useState(seeded.split(" ")[0] || "");
  const [lastName, setLastName] = useState(seeded.split(" ").slice(1).join(" "));
  const [bio, setBio] = useState("");
  const [zip, setZip] = useState("");
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const createProfile = async () => {
    setSaving(true);
    setError("");

    // Names must be real names — never the email username, digits or symbols.
    if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
      setError("Enter your first and last name — letters only, and not your email address.");
      setSaving(false);
      return;
    }
    if (!isCaliforniaZip(zip)) {
      setError("Enter a 5-digit California ZIP code.");
      setSaving(false);
      return;
    }

    // Idempotent: if a profile already exists (e.g. from a previous partial
    // onboarding), reuse it instead of creating a duplicate.
    const existing = await base44.entities.TeenProfile.filter({ user_id: user.id });
    let profile = existing[0];

    if (!profile) {
      let geo;
      try {
        const res = await base44.functions.invoke("geocodeAddress", { query: `${zip}, ${usState}` });
        geo = res.data;
      } catch (err) {
        setError(err.response?.data?.error || "Couldn't verify that ZIP code. Please check it and try again.");
        setSaving(false);
        return;
      }
      const result = checkEligibility(dob, usState);
      // Public profile — no sensitive data (DOB, exact coordinates, ZIP)
      profile = await base44.entities.TeenProfile.create({
        user_id: user.id,
        display_name: `${firstName.trim()} ${lastName.trim() ? lastName.trim()[0].toUpperCase() + "." : ""}`.trim(),
        bio,
        state: usState,
        eligibility_min_age: result.minAge,
        resolved_city: geo.city,
        skills,
        invite_code: genInviteCode(),
      });
      // Private data — DOB, age, real name, exact coordinates, ZIP. Readable only
      // by the teen, their linked parent, and admins (RLS-enforced).
      await base44.entities.TeenPrivateData.create({
        user_id: user.id,
        date_of_birth: dob,
        legal_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        age: calcAge(dob),
        zip,
        latitude: geo.lat,
        longitude: geo.lng,
      });
    } else if (!profile.invite_code) {
      await base44.entities.TeenProfile.update(profile.id, { invite_code: genInviteCode() });
    }

    // The server re-checks the role, age and California ZIP, and grants app_role.
    const roleRes = await base44.functions.invoke("saveSignupRole", {
      role: "teen",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      zip: zip.trim(),
    });
    if (roleRes.data?.error) {
      setError(roleRes.data.error);
      setSaving(false);
      return;
    }

    const age = calcAge(dob);
    base44.analytics.track({
      eventName: "teen_onboarding_complete",
      properties: { state: usState, age, is_independent: age !== null && age >= 18 },
    });

    if (age !== null && age >= 18) {
      // 18+ — no parent needed, activate the profile immediately. This teen
      // accepts the Terms for themselves; a minor's parent accepts on their
      // behalf when they link, so minors record nothing here.
      try {
        await base44.functions.invoke("activateIndependentTeen", {});
      } catch {
        /* non-fatal — the profile still exists */
      }
      try {
        await base44.functions.invoke("acceptTerms", { accepted: true, userAgent: navigator.userAgent });
      } catch (err) {
        setError(err?.response?.data?.error || "Couldn't save your Terms acceptance. Please try again.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    // The next screen (parent link for a minor, the dashboard for an adult) is
    // decided by the server-side step, so reload the account rather than routing.
    onProfileSaved();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Build your profile</h2>
      <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-foreground font-medium">
        <MapPin className="w-4 h-4 shrink-0" />
        Eligible to work in {stateName(usState)} · Age {calcAge(dob)}
      </div>
      <p className="text-sm text-muted-foreground">Neighbors will only ever see your first name and last initial.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label className="text-foreground">First name</Label>
          <Input className="rounded-xl mt-1 h-12" maxLength={48} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="min-w-0">
          <Label className="text-foreground">Last name</Label>
          <Input className="rounded-xl mt-1 h-12" maxLength={48} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-foreground">California ZIP code</Label>
        <Input
          className="rounded-xl mt-1 h-12"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="5-digit ZIP"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
        />
        <p className="text-xs text-muted-foreground mt-1">Blockwork is available in California only.</p>
      </div>
      <div>
        <Label className="text-foreground">Bio</Label>
        <Textarea className="rounded-xl mt-1" maxLength={500} placeholder="Tell neighbors a bit about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <Label className="text-foreground">Skills</Label>
        <p className="text-xs text-muted-foreground mt-1 mb-2">
          Pick from popular services or add your own — you can change these anytime.
        </p>
        <SkillPicker value={skills} onChange={setSkills} />
      </div>
      {error && <p className="text-xs text-destructive font-medium" role="alert">{error}</p>}
      <Button className="w-full h-12 font-medium" disabled={!firstName || !lastName || zip.length !== 5 || saving} onClick={createProfile}>
        {saving ? "Creating..." : "Create profile"}
      </Button>
    </div>
  );
}