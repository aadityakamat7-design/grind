import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldX, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/grind";
import { screenJob, US_STATES } from "@/lib/jobScreen";

export default function JobPostForm({ open, onOpenChange, buyer, buyerProfile, onPosted }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "odd_jobs", price: "",
    price_model: "FIXED", state: "", scheduled_start: "",
  });
  const [phase, setPhase] = useState("form"); // form | screening | blocked | approved
  const [screening, setScreening] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.category && Number(form.price) > 0 && form.state;

  const submit = async () => {
    setPhase("screening");
    const result = await screenJob({
      title: form.title, description: form.description,
      category: form.category, price: Number(form.price), state: form.state,
    });
    setScreening(result);
    if (!result.allowed) {
      setPhase("blocked");
      return;
    }
    await base44.entities.JobPost.create({
      buyer_user_id: buyer.id,
      buyer_name: buyer.full_name || "Neighbor",
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      price_model: form.price_model,
      zip: buyerProfile?.zip || "",
      state: form.state,
      scheduled_start: form.scheduled_start || undefined,
      ai_approved: true,
      ai_minimum_age: result.minimum_age || 13,
      ai_law_notes: result.state_law_notes || "",
      status: "open",
    });
    setPhase("approved");
    onPosted?.();
  };

  const close = (v) => {
    if (!v) { setPhase("form"); setScreening(null); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post a job for local teens</DialogTitle>
        </DialogHeader>

        {phase === "screening" && (
          <div className="py-10 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="font-bold text-slate-900 text-sm">Checking child labor laws…</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Our AI is reviewing this job against federal rules and {form.state} child labor law before it can go live.
            </p>
          </div>
        )}

        {phase === "blocked" && (
          <div className="py-4 space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <p className="font-bold text-rose-700 text-sm flex items-center gap-1.5">
                <ShieldX className="w-4 h-4" /> This job can't be posted
              </p>
              <p className="text-sm text-rose-700 mt-2">{screening?.reason}</p>
              {screening?.state_law_notes && (
                <p className="text-xs text-rose-600 mt-2">{screening.state_law_notes}</p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Teen safety comes first on Grind. Try adjusting the task so it doesn't involve prohibited work, then post again.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setPhase("form")}>
              Edit and try again
            </Button>
          </div>
        )}

        {phase === "approved" && (
          <div className="py-4 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Approved & posted!
              </p>
              <p className="text-sm text-emerald-700 mt-2">{screening?.reason}</p>
              {screening?.minimum_age > 13 && (
                <p className="text-xs text-emerald-600 mt-2 font-semibold">
                  Minimum teen age for this job in {form.state}: {screening.minimum_age}
                </p>
              )}
              {screening?.state_law_notes && (
                <p className="text-xs text-emerald-600 mt-2">{screening.state_law_notes}</p>
              )}
            </div>
            <Button className="w-full rounded-xl" onClick={() => close(false)}>Done</Button>
          </div>
        )}

        {phase === "form" && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              Every job is screened by AI against your state's child labor laws before it goes live.
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input className="rounded-xl" placeholder="e.g. Weed the front flower beds" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea className="rounded-xl" placeholder="What needs to get done? Any tools or details teens should know about?" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Your state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay ($)</Label>
                <Input className="rounded-xl" type="number" min="1" placeholder="25" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Pay type</Label>
                <Select value={form.price_model} onValueChange={(v) => set("price_model", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed</SelectItem>
                    <SelectItem value="HOURLY">Per hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>When (optional)</Label>
              <Input className="rounded-xl" type="datetime-local" value={form.scheduled_start} onChange={(e) => set("scheduled_start", e.target.value)} />
            </div>
            <Button className="w-full rounded-xl" disabled={!valid} onClick={submit}>
              Run safety check & post
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}