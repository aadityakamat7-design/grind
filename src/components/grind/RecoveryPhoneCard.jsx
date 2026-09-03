import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck } from "lucide-react";

// Lets any user set a recovery phone number on their own User record.
// Stored via base44.auth.updateMe so it travels with the auth account.
// The number is private — only the user and support can see it.
export default function RecoveryPhoneCard({ user }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState(user.recovery_phone || "");
  const [saving, setSaving] = useState(false);
  const dirty = phone !== (user.recovery_phone || "");

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ recovery_phone: phone.trim() });
      toast({
        title: "Recovery phone saved",
        description: phone.trim()
          ? "We'll use this to verify your identity if you lose email access."
          : "Recovery phone removed.",
      });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Account recovery</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Add a phone number we can use to help verify your identity if you lose
        access to your email. This number is private — only you and our support
        team can see it.
      </p>
      <div>
        <Label>Recovery phone number</Label>
        <Input
          className="rounded-xl mt-1"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button
        className="w-full rounded-full"
        disabled={saving || !dirty}
        onClick={save}
      >
        {saving ? "Saving..." : "Save recovery number"}
      </Button>
    </div>
  );
}