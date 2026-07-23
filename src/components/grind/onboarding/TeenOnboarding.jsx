import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Check, ShieldAlert, MapPin } from "lucide-react";
import { calcAge, genInviteCode, SKILL_SUGGESTIONS } from "@/lib/grind";
import { checkEligibility, stateName } from "@/lib/stateWorkRules";
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
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");

  const toggleSkill = (s) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const createProfile = async () => {
    setSaving(true);
    setGeoError("");
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
    const code = genInviteCode();
    await base44.entities.TeenProfile.create({
      user_id: user.id,
      display_name: `${firstName} ${lastInitial ? lastInitial.toUpperCase() + "." : ""}`.trim(),
      bio,
      date_of_birth: dob,
      age: calcAge(dob),
      state: usState,
      eligibility_min_age: result.minAge,
      zip,
      latitude: geo.lat,
      longitude: geo.lng,
      resolved_city: geo.city,
      skills,
      invite_code: code,
    });
    // Persist state + eligibility on the user record so it isn't re-checked incorrectly later
    await base44.auth.updateMe({
      app_role: "TEEN",
      onboarded: true,
      date_of_birth: dob,
      work_state: usState,
      eligibility_status: result.status,
      eligibility_min_age: result.minAge,
    });
    localStorage.removeItem("kickstart_teen_dob");
    localStorage.removeItem("kickstart_teen_state");
    localStorage.removeItem("kickstart_teen_min_age");
    setInviteCode(code);
    setSaving(false);
    setStep(3);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(
      `Hey! I'm joining Kickstart to earn money doing local jobs. I need you to approve my account — download the app, sign up as a Parent, and enter my code: ${inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">Are you eligible in your state?</h2>
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
        <h2 className="text-xl font-extrabold text-slate-900">Build your profile</h2>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold">
          <MapPin className="w-4 h-4 shrink-0" />
          Eligible to work in {stateName(usState)} · Age {calcAge(dob)}
        </div>
        <p className="text-sm text-slate-600">Neighbors will only ever see your first name and last initial.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-800">First name</Label>
            <Input className="rounded-xl mt-1 text-slate-900" maxLength={48} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label className="text-slate-800">Last initial</Label>
            <Input className="rounded-xl mt-1 text-slate-900" maxLength={1} value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-slate-800">ZIP code</Label>
          <Input className="rounded-xl mt-1 text-slate-900" placeholder="Your neighborhood ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div>
          <Label className="text-slate-800">Bio</Label>
          <Textarea className="rounded-xl mt-1 text-slate-900" maxLength={500} placeholder="Tell neighbors a bit about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label className="text-slate-800">Skills</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SKILL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  skills.includes(s)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {geoError && <p className="text-xs text-rose-600 font-semibold">{geoError}</p>}
        <Button className="w-full rounded-xl" disabled={!firstName || !zip || saving} onClick={createProfile}>
          {saving ? "Creating..." : "Create profile"}
        </Button>
      </div>
    );

  return (
    <div className="space-y-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900">Invite your parent</h2>
      <p className="text-sm text-slate-600">
        Your account is <span className="font-semibold">waiting for a parent</span>. You can't publish services or take bookings until a parent or guardian links to your account and approves it.
      </p>
      <div className="bg-slate-50 rounded-2xl p-5">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Your parent code</p>
        <p className="text-3xl font-extrabold tracking-[0.3em] text-blue-600 mt-1">{inviteCode}</p>
      </div>
      <Button variant="outline" className="w-full rounded-xl" onClick={copyCode}>
        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
        {copied ? "Copied!" : "Copy invite message"}
      </Button>
      {/* Hard redirect so the freshly-set role is picked up */}
      <Button className="w-full rounded-xl" onClick={() => { window.location.href = "/teen"; }}>Go to my dashboard</Button>
    </div>
  );
}