import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddGoalDialog({ open, onOpenChange, teenUserId, onSaved }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.entities.SavingsGoal.create({
      teen_user_id: teenUserId,
      name,
      target_amount: Number(target),
      saved_amount: 0,
      status: "active",
    });
    setSaving(false);
    setName("");
    setTarget("");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>New savings goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>What are you saving for?</Label>
            <Input className="rounded-xl mt-1" placeholder="e.g. New laptop" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Target amount ($)</Label>
            <Input type="number" min="1" className="rounded-xl mt-1" placeholder="500" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <Button className="w-full rounded-xl" disabled={!name || !target || saving} onClick={save}>
            {saving ? "Creating..." : "Create goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}