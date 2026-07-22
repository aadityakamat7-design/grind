import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ResponsiveSelect from "@/components/grind/ResponsiveSelect";
import { ShieldCheck, ShieldX, Sparkles, Lock } from "lucide-react";
import { CATEGORIES, computeFees, money } from "@/lib/grind";
import { screenJob, US_STATES } from "@/lib/jobScreen";
import { startJobCheckout } from "@/lib/stripeCheckout";

export default function JobPostForm({ open, onOpenChange, buyer, buyerProfile, onPosted }) {
  const [form, setForm] = useState({
    title: "", description: "", category: "odd_jobs", price: "",
    price_model: "FIXED", state: "", scheduled_start: "",
    is_physical: true, address: "",
  });
  const [phase, setPhase] = useState("form"); // form | screening | blocked | approved | paying
  const [screening, setScreening] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.category && Number(form.price) > 0 && form.state && (!form.is_physical || form.address.trim());
  const { platform_fee, net_amount } = computeFees(Number(form.price) || 0);

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
    const job = await base44.entities.JobPost.create({
      buyer_user_id: buyer.id,
      buyer_name: buyer.full_name || "Neighbor",
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      price: Number(form.price),
      price_model: form.price_model,
      zip: buyerProfile?.zip || "",
      state: form.state,
      is_physical: form.is_physical,
      address: form.is_physical ? form.address.trim() : "",
      scheduled_start: form.scheduled_start || undefined,
      ai_approved: true,
      ai_minimum_age: result.minimum_age || 13,
      ai_law_notes: result.state_law_notes || "",
    });
    onPosted?.();
    setPhase("paying");
    const checkoutResult = await startJobCheckout(job.id);
    if (checkoutResult.paid || checkoutResult.blocked) setPhase("approved");
    // otherwise the browser is redirecting to Stripe checkout
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

        {phase === "paying" && (
          <div className="py-10 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="font-bold text-slate-900 text-sm">Redirecting to secure checkout…</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your job stays a draft and won't go live until the posting fee is paid and held in escrow.
            </p>
          </div>
        )}

        {phase === "approved" && (
          <div className="py-4 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Paid & posted!
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
                <ResponsiveSelect
                  value={form.category}
                  onValueChange={(v) => set("category", v)}
                  options={CATEGORIES}
                  title="Category"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <ResponsiveSelect
                  value={form.state}
                  onValueChange={(v) => set("state", v)}
                  options={US_STATES.map((s) => ({ value: s, label: s }))}
                  placeholder="Your state"
                  title="State"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay ($)</Label>
                <Input className="rounded-xl" type="number" min="1" placeholder="25" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Pay type</Label>
                <ResponsiveSelect
                  value={form.price_model}
                  onValueChange={(v) => set("price_model", v)}
                  options={[{ value: "FIXED", label: "Fixed" }, { value: "HOURLY", label: "Per hour" }]}
                  title="Pay type"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>When (optional)</Label>
              <Input className="rounded-xl" type="datetime-local" value={form.scheduled_start} onChange={(e) => set("scheduled_start", e.target.value)} />
            </div>
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
              <div>
                <Label>Physical, in-person job?</Label>
                <p className="text-xs text-slate-500 mt-0.5">Turn off for remote tasks like tutoring or tech help online.</p>
              </div>
              <Switch checked={form.is_physical} onCheckedChange={(v) => set("is_physical", v)} />
            </div>
            {form.is_physical && (
              <div className="space-y-1.5">
                <Label>Job address</Label>
                <Input className="rounded-xl" placeholder="Where will the job happen?" value={form.address} onChange={(e) => set("address", e.target.value)} />
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Only shared with the teen and their parent once a teen accepts and the parent approves.
                </p>
              </div>
            )}
            {Number(form.price) > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">You pay now (held in escrow)</span><span className="font-bold">{money(form.price)}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Platform fee (15%)</span><span>{money(platform_fee)}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Teen earns (85%)</span><span>{money(net_amount)}</span></div>
              </div>
            )}
            <Button className="w-full rounded-xl" disabled={!valid} onClick={submit}>
              Run safety check, then pay {form.price ? money(form.price) : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}