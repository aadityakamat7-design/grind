import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, MapPin } from "lucide-react";
import { calcAge, genInviteCode } from "@/lib/grind";
import ShareInvite from "@/components/grind/ShareInvite";
import SkillPicker from "@/components/grind/SkillPicker";
import { checkEligibility, stateName } from "@/lib/stateWorkRules";
import { setCachedUser } from "@/lib/useAppUser";
import TeenEligibilityStep from "@/components/grind/onboarding/TeenEligibilityStep";
import { seededName, isRealName, isCaliforniaZip } from "@/lib/signupState";

export default function TeenOnboarding({ user }) {
  const storedDob = user.date_of_birth || localStorage.getItem("kickstart_teen_dob") || "";
  const storedState = user.work_state || localStorage.getItem("kickstart_teen_state") || "";
  const [dob, setDob] = useState(storedDob);
  const [usState, setUsState] = useState(storedState);
  const [step, setStep] = useState(storedDob && storedState ? 2 : 1);
  // Names are only ever seeded from a real name already on the account — never
  // from the email username the platform writes at sign-up.
  const seeded = seededName(user);
  const [firstName, setFirstName] = useState(seeded.split(" ")[0] || "");
  const [lastName, setLastName] = useState(seeded.split(" ").slice(1).join(" "));
  const [bio, setBio] = useState("");
  const [zip, setZip] = useState("");
  const [skills, setSkills] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [done, setDone] = useState(false);

  const createProfile = async () => {
    setSaving(true);
    setGeoError("");

    // Names must be real names — never the email username, digits or symbols.
    if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
      setGeoError("Enter your first and last name — letters only, and not your email address.");
      setSaving(false);
      return;
    }
    if (!isCaliforniaZip(zip)) {
      setGeoError("Enter a 5-digit California ZIP code.");
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
        setGeoError(err.response?.data?.error || "Couldn't verify that ZIP code. Please check it and try again.");
        setSaving(false);
        return;
      }
      const result = checkEligibility(dob, usState);
      const newCode = genInviteCode();
      // Public profile — no sensitive data (DOB, exact coordinates, ZIP)
      profile = await base44.entities.TeenProfile.create({
        user_id: user.id,
        display_name: `${firstName.trim()} ${lastName.trim() ? lastName.trim()[0].toUpperCase() + "." : ""}`.trim(),
        bio,
        state: usState,
        eligibility_min_age: result.minAge,
        resolved_city: geo.city,
        skills,
        invite_code: newCode,
      });
      // Private data — DOB, age, exact coordinates, ZIP. Readable only by the
      // teen, their linked parent, and admins (RLS-enforced).
      await base44.entities.TeenPrivateData.create({
        user_id: user.id,
        date_of_birth: dob,
        // Private: the real name never appears on the public profile.
        legal_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        age: calcAge(dob),
        zip,
        latitude: geo.lat,
        longitude: geo.lng,
      });
    }

    // Ensure the profile has an invite code (self-heal for older profiles)
    let code = profile.invite_code;
    if (!code) {
      code = genInviteCode();
      await base44.entities.TeenProfile.update(profile.id, { invite_code: code });
    }

    // Teen ToS consent: teens are minors, so their legal relationship to the
    // platform is covered by the parent's ToS acceptance during ParentOnboarding
    // (confirmParentLink flow), where the parent attests guardianship and accepts
    // the Terms. If legal counsel determines teens need their own ToS acceptance,
    // add a ToS checkbox here and record terms_accepted_at + terms_version.
    // Persist state + eligibility on the user record so it isn't re-checked incorrectly later
    // The server re-checks the role, age, state and California ZIP, and sets
    // app_role — the browser can't grant itself a role.
    const roleRes = await base44.functions.invoke("saveSignupRole", {
      role: "teen",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob,
      zip: zip.trim(),
      state: usState,
    });
    if (roleRes.data?.error) {
      setGeoError(roleRes.data.error);
      setSaving(false);
      return;
    }
    const updatedUser = {
      ...user,
      app_role: "teen",
      onboarded: true,
      date_of_birth: dob,
      work_state: usState,
    };
    setCachedUser(updatedUser);
    base44.analytics.track({
      eventName: "teen_onboarding_complete",
      properties: { state: usState, age: calcAge(dob), is_independent: calcAge(dob) !== null && calcAge(dob) >= 18 },
    });
    localStorage.removeItem("kickstart_teen_dob");
    localStorage.removeItem("kickstart_teen_state");
    localStorage.removeItem("kickstart_teen_min_age");
    const age = calcAge(dob);
    if (age !== null && age >= 18) {
      // 18+ — no parent needed, activate the profile immediately
      try {
        await base44.functions.invoke("activateIndependentTeen", {});
      } catch { /* non-fatal — profile still exists */ }
      setSaving(false);
      setDone(true);
      return;
    }
    setInviteCode(code);
    setSaving(false);
    setStep(3);
  };

  if (done)
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground">You're all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your profile is live. Neighbors can now book you for jobs in your area.
        </p>
        <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/teen"; }}>
          Go to dashboard
        </Button>
      </div>
    );

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Are you eligible in your state?</h2>
        <TeenEligibilityStep
          initialDob={dob}
          initialState={usState}
          onEligible={({ dob: d, state: st }) => {
            setDob(d);
            setUsState(st);
            setStep(2);
          }}
        />
      </div>
    );

  if (step === 2)
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
            <Input className="rounded-xl mt-1" maxLength={48} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="min-w-0">
            <Label className="text-foreground">Last name</Label>
            <Input className="rounded-xl mt-1" maxLength={48} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-foreground">California ZIP code</Label>
          <Input
            className="rounded-xl mt-1"
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
        {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
        <Button className="w-full rounded-xl" disabled={!firstName || !lastName || zip.length !== 5 || saving} onClick={createProfile}>
          {saving ? "Creating..." : "Create profile"}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-foreground">You're ready to go!</h2>
      <p className="text-sm text-muted-foreground">
        Share your code below with your parent or guardian. Once they link, you can <span className="font-semibold text-foreground">post services and take jobs</span>, and they'll approve each one.
      </p>
      <div className="bg-muted rounded-2xl p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your parent code</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-foreground mt-1">{inviteCode}</p>
      </div>
      <ShareInvite code={inviteCode} />
      {/* Hard redirect so the freshly-set role is picked up */}
      <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/teen"; }}>Go to dashboard</Button>
    </div>
  );
}