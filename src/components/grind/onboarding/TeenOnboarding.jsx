import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Copy, Check, ShieldAlert } from "lucide-react";
import { calcAge, genInviteCode, SKILL_SUGGESTIONS } from "@/lib/grind";

export default function TeenOnboarding({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dob, setDob] = useState("");
  const [ageError, setAgeError] = useState("");
  const [firstName, setFirstName] = useState(user.full_name?.split(" ")[0] || "");
  const [lastInitial, setLastInitial] = useState((user.full_name?.split(" ")[1] || "").charAt(0));
  const [bio, setBio] = useState("");
  const [zip, setZip] = useState("");
  const [skills, setSkills] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const checkAge = () => {
    const age = calcAge(dob);
    if (age === null) return;
    if (age < 13) {
      setAgeError("Sorry — you must be at least 13 to use Grind.");
      return;
    }
    if (age > 17) {
      setAgeError("Grind teen accounts are for ages 13–17. If you're 18+, sign up as a neighbor instead.");
      return;
    }
    setAgeError("");
    setStep(2);
  };

  const toggleSkill = (s) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const createProfile = async () => {
    setSaving(true);
    const code = genInviteCode();
    await base44.entities.TeenProfile.create({
      user_id: user.id,
      display_name: `${firstName} ${lastInitial ? lastInitial.toUpperCase() + "." : ""}`.trim(),
      bio,
      date_of_birth: dob,
      age: calcAge(dob),
      zip,
      skills,
      invite_code: code,
      status: "pending_parent",
    });
    await base44.auth.updateMe({ app_role: "TEEN", onboarded: true });
    setInviteCode(code);
    setSaving(false);
    setStep(3);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(
      `Hey! I'm joining Grind to earn money doing local jobs. I need you to approve my account — download the app, sign up as a Parent, and enter my code: ${inviteCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">First, how old are you?</h2>
        <p className="text-sm text-slate-500">Grind is for teens 13–17. We need your date of birth to check.</p>
        <div>
          <Label>Date of birth</Label>
          <Input type="date" className="rounded-xl mt-1" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        {ageError && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            {ageError}
          </div>
        )}
        <Button className="w-full rounded-xl" disabled={!dob} onClick={checkAge}>Continue</Button>
      </div>
    );

  if (step === 2)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-900">Build your profile</h2>
        <p className="text-sm text-slate-500">Neighbors will only ever see your first name and last initial.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input className="rounded-xl mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last initial</Label>
            <Input className="rounded-xl mt-1" maxLength={1} value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>ZIP code</Label>
          <Input className="rounded-xl mt-1" placeholder="Your neighborhood ZIP" value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea className="rounded-xl mt-1" placeholder="Tell neighbors a bit about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <Label>Skills</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SKILL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  skills.includes(s)
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
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
      <p className="text-sm text-slate-500">
        Your account is <span className="font-semibold">waiting for a parent</span>. You can't publish services or take bookings until a parent or guardian links to your account and approves it.
      </p>
      <div className="bg-slate-50 rounded-2xl p-5">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Your parent code</p>
        <p className="text-3xl font-extrabold tracking-[0.3em] text-violet-600 mt-1">{inviteCode}</p>
      </div>
      <Button variant="outline" className="w-full rounded-xl" onClick={copyCode}>
        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
        {copied ? "Copied!" : "Copy invite message"}
      </Button>
      <Button className="w-full rounded-xl" onClick={() => navigate("/teen")}>Go to my dashboard</Button>
    </div>
  );
}