import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { calcAge, makeInviteCode, CATEGORIES } from "@/lib/grind";
import { ArrowLeft, Copy, Check } from "lucide-react";

export default function TeenSetup({ user, onDone, onBack }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ first_name: "", last_initial: "", dob: "", bio: "", zip: "", skills: [] });
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSkill = (s) =>
    set("skills", form.skills.includes(s) ? form.skills.filter((x) => x !== s) : [...form.skills, s]);

  const submitProfile = async () => {
    setError("");
    const age = calcAge(form.dob);
    if (!form.first_name || !form.last_initial || !form.dob || !form.zip) {
      setError("Please fill in all fields.");
      return;
    }
    if (age === null || age < 13) {
      setError("Sorry — Grind is for teens 13 and older. You can't sign up yet.");
      return;
    }
    if (age > 17) {
      setError("Grind teen accounts are for ages 13–17. Since you're 18+, sign up as a neighbor instead.");
      return;
    }
    setSaving(true);
    const code = makeInviteCode();
    await base44.entities.TeenProfile.create({
      display_name: `${form.first_name} ${form.last_initial.toUpperCase()}.`,
      date_of_birth: form.dob,
      bio: form.bio,
      zip: form.zip,
      skills: form.skills,
      invite_code: code,
      status: "pending_parent",
    });
    setInviteCode(code);
    setSaving(false);
    setStep(2);
  };

  const copy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (step === 2) {
    return (
      <div>
        <h1 className="font-display text-2xl font-extrabold mb-2">Invite your parent</h1>
        <p className="text-muted-foreground mb-6">
          Your account stays locked until a parent or guardian links up and approves you. Share this code with them —
          they'll enter it when they sign up as a parent.
        </p>
        <div className="bg-card border border-border rounded-2xl p-6 text-center mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Parent invite code</div>
          <div className="font-display text-4xl font-extrabold tracking-[0.3em] mb-4">{inviteCode}</div>
          <Button variant="outline" onClick={copy} className="rounded-full">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? "Copied!" : "Copy code"}
          </Button>
        </div>
        <Button className="w-full rounded-full h-12" onClick={onDone}>Continue to my dashboard</Button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-extrabold mb-1">Set up your profile</h1>
      <p className="text-muted-foreground mb-6 text-sm">Only your first name + last initial are shown publicly.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First name</Label>
            <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Maya" />
          </div>
          <div>
            <Label>Last initial</Label>
            <Input value={form.last_initial} maxLength={1} onChange={(e) => set("last_initial", e.target.value)} placeholder="R" />
          </div>
        </div>
        <div>
          <Label>Date of birth</Label>
          <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">You must be 13–17 to join as a teen.</p>
        </div>
        <div>
          <Label>ZIP code</Label>
          <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="10011" maxLength={5} />
        </div>
        <div>
          <Label>Skills</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleSkill(c.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  form.skills.includes(c.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Short bio</Label>
          <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Honor-roll sophomore, great with dogs and lawns…" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full rounded-full h-12" onClick={submitProfile} disabled={saving}>
          {saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}