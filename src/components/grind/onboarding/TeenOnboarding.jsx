import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, MapPin } from "lucide-react";
import { calcAge, genInviteCode, SKILL_SUGGESTIONS } from "@/lib/grind";
import ShareInvite from "@/components/grind/ShareInvite";
import { checkEligibility, stateName } from "@/lib/stateWorkRules";
import { setCachedUser } from "@/lib/useAppUser";
import TeenEligibilityStep from "@/components/grind/onboarding/TeenEligibilityStep";

export default function TeenOnboarding({ user }) {
  const storedDob = user.date_of_birth || localStorage.getItem("kickstart_teen_dob") || "";
  const storedState = user.work_state || localStorage.getItem("kickstart_teen_state") || "";
  const [dob, setDob] = useState(storedDob);
  const [usState, setUsState] = useState(storedState);
  const [step, setStep] = useState(storedDob && storedState ? 2 : 1);
  const [firstName, setFirstName] = useState(user.full_name?.split(" ")[0] || "");
  const [lastInitial, setLastInitial] = useState((user.full_name?.split(" ")[1] || "").charAt(0));
  const [bio, setBio] = useState("");
  const [zip, setZip] = useState("");
  const [skills, setSkills] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");

  const toggleSkill = (s) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const createProfile = async () => {
    setSaving(true);
    setGeoError("");

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
        display_name: `${firstName} ${lastInitial ? lastInitial.toUpperCase() + "." : ""}`.trim(),
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
    const updatedUser = {
      ...user,
      app_role: "teen",
      onboarded: true,
      date_of_birth: dob,
      work_state: usState,
    };
    await base44.auth.updateMe(updatedUser);
    setCachedUser(updatedUser);
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
      window.location.href = "/teen";
      return;
    }
    setInviteCode(code);
    setSaving(false);
    setStep(3);
  };

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
          <div>
            <Label className="text-foreground">First name</Label>
            <Input className="rounded-xl mt-1" maxLength={48} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label className="text-foreground">Last initial</Label>
            <Input className="rounded-xl mt-1" maxLength={1} value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-foreground">ZIP code</Label>
          <Input className="rounded-xl mt-1" placeholder="Your neighborhood ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div>
          <Label className="text-foreground">Bio</Label>
          <Textarea className="rounded-xl mt-1" maxLength={500} placeholder="Tell neighbors a bit about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label className="text-foreground">Skills</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SKILL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  skills.includes(s)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border hover:border-foreground/30"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
        <Button className="w-full rounded-xl" disabled={!firstName || !zip || saving} onClick={createProfile}>
          {saving ? "Creating..." : "Create profile"}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Invite your parent</h2>
      <p className="text-sm text-muted-foreground">
        Your account is <span className="font-semibold">waiting for a parent</span>. You can't publish services or take bookings until a parent or guardian links to your account and approves it.
      </p>
      <div className="bg-muted rounded-2xl p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Your parent code</p>
        <p className="text-3xl font-bold tracking-[0.3em] text-foreground mt-1">{inviteCode}</p>
      </div>
      <ShareInvite code={inviteCode} />
      {/* Hard redirect so the freshly-set role is picked up */}
      <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/teen"; }}>Go to my dashboard</Button>
    </div>
  );
}