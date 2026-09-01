import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/grind/ResponsiveSelect";
import { ShieldCheck, ShieldX, Sparkles, Lock, Tag, AlertCircle } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, categoryMinimum, computeFees, money, MAX_UNIT_PRICE, isOnlineCategory } from "@/lib/grind";
import { getMinAgeForCategory } from "@/lib/stateWorkRules";
import SlideToConfirm from "@/components/grind/SlideToConfirm";
import DateTimePicker from "@/components/grind/DateTimePicker";
import { US_STATES } from "@/lib/jobScreen";

export default function JobPostForm({ open, onOpenChange, buyer, buyerProfile, onPosted }) {
  const [form, setForm] = useState({
    title: "", description: "", price: "",
    price_model: "FIXED", state: "", scheduled_start: "",
    is_physical: true, address: "",
  });
  const [phase, setPhase] = useState("form"); // form | category_review | screening | blocked | approved
  const [screening, setScreening] = useState(null);
  const [aiCategory, setAiCategory] = useState(null); // { category, confidence, reason }
  const [chosenCategory, setChosenCategory] = useState(null);
  const [categoryError, setCategoryError] = useState("");
  const [priceRec, setPriceRec] = useState(null);
  const [priceRecLoading, setPriceRecLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fetchPriceRec = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setPriceRecLoading(true);
    try {
      const res = await base44.functions.invoke("recommendPrice", {
        title: form.title.trim(),
        description: form.description.trim(),
        priceModel: form.price_model,
        state: form.state,
      });
      setPriceRec(res.data?.recommendation || null);
    } catch {
      setPriceRec(null);
    } finally {
      setPriceRecLoading(false);
    }
  };

  const priceError = Number(form.price) > MAX_UNIT_PRICE ? `Max ${MAX_UNIT_PRICE} per job` : "";
  const valid = form.title.trim().length >= 3 && Number(form.price) > 0 && !priceError && form.state;
  const { platform_fee, net_amount } = computeFees(Number(form.price) || 0);

  // Step 1: run the AI category check, then show the category + minimum review.
  const reviewCategory = async () => {
    setPhase("screening");
    setCategoryError("");
    try {
      const res = await base44.functions.invoke("screenJobCategory", {
        title: form.title.trim(),
        description: form.description.trim(),
        priceModel: form.price_model,
      });
      const s = res.data?.screening;
      const cat = s?.category || "odd_jobs";
      setAiCategory(s || { category: cat, confidence: "low", reason: "We couldn't classify this job automatically." });
      setChosenCategory(cat);
      setPhase("category_review");
    } catch (err) {
      // Fall back to odd_jobs so the neighbor can still post
      setAiCategory({ category: "odd_jobs", confidence: "low", reason: "We couldn't classify this job automatically — please pick a category." });
      setChosenCategory("odd_jobs");
      setPhase("category_review");
    }
  };

  const minFor = (cat) => categoryMinimum(cat, form.price_model);
  const currentMin = chosenCategory ? minFor(chosenCategory) : 0;
  const belowMin = Number(form.price) > 0 && Number(form.price) < currentMin;
  const categoryAgeReq = chosenCategory && form.state ? getMinAgeForCategory(form.state, chosenCategory) : null;

  // Step 2: confirm the category (and fix price if below minimum), then run
  // the child labor law screening via createJobPost.
  const submit = async () => {
    if (belowMin) return;
    setPhase("screening");
    let job;
    try {
      const res = await base44.functions.invoke("createJobPost", {
        buyerName: buyer.full_name || "Neighbor",
        title: form.title.trim(),
        description: form.description.trim(),
        category: chosenCategory,
        price: Number(form.price),
        price_model: form.price_model,
        zip: buyerProfile?.zip || "",
        state: form.state,
        is_physical: !isOnlineCategory(chosenCategory),
        address: isOnlineCategory(chosenCategory) ? "" : form.address.trim(),
        scheduledStart: form.scheduled_start || undefined,
      });
      job = res.data.job;
      setScreening(res.data.screening || { allowed: true, reason: "This job passed the AI safety check.", minimum_age: job.ai_minimum_age, state_law_notes: job.ai_law_notes });
    } catch (err) {
      const screening = err.response?.data?.screening;
      setScreening({
        reason: err.response?.data?.error || "Couldn't screen this job.",
        state_law_notes: screening?.state_law_notes,
        minimum_age: screening?.minimum_age,
      });
      setPhase("blocked");
      return;
    }
    onPosted?.();
    setPhase("approved");
  };

  const close = (v) => {
    if (!v) { setPhase("form"); setScreening(null); setAiCategory(null); setChosenCategory(null); setCategoryError(""); }
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
            <div className="w-10 h-10 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto" />
            <p className="font-bold text-foreground text-sm">Checking your job…</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Our AI is picking the right category and reviewing this job against {form.state} child labor law.
            </p>
          </div>
        )}

        {phase === "blocked" && (
          <div className="py-4 space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
              <p className="font-bold text-destructive text-sm flex items-center gap-1.5">
                <ShieldX className="w-4 h-4" /> This job can't be posted
              </p>
              <p className="text-sm text-destructive mt-2">{screening?.reason}</p>
              {screening?.state_law_notes && (
                <p className="text-xs text-destructive/80 mt-2">{screening.state_law_notes}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Teen safety comes first on Blockwork. Try adjusting the task so it doesn't involve prohibited work, then post again.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setPhase("form")}>
              Edit and try again
            </Button>
          </div>
        )}

        {phase === "approved" && (
          <div className="py-4 space-y-4">
            <div className="bg-secondary border border-border rounded-2xl p-4">
              <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Job posted!
              </p>
              <p className="text-sm text-muted-foreground mt-2">{screening?.reason}</p>
              {screening?.minimum_age > 13 && (
                <p className="text-xs text-foreground mt-2 font-semibold">
                  Minimum teen age for this job in {form.state}: {screening.minimum_age}
                </p>
              )}
              {screening?.state_law_notes && (
                <p className="text-xs text-muted-foreground mt-2">{screening.state_law_notes}</p>
              )}
            </div>
            <Button className="w-full" onClick={() => close(false)}>Done</Button>
          </div>
        )}

        {phase === "category_review" && aiCategory && chosenCategory && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-secondary rounded-xl p-3 text-xs text-muted-foreground">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Our AI read your job and categorized it. Confirm or change the category below.</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Tag className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    This looks like a {CATEGORY_LABELS[chosenCategory] || chosenCategory} job
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{aiCategory.reason}</p>
                  {aiCategory.confidence === "low" && (
                    <p className="text-xs text-muted-foreground/80 mt-1">This could fit more than one category — change it if it's not right.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <ResponsiveSelect
                  value={chosenCategory}
                  onValueChange={(v) => { setChosenCategory(v); setCategoryError(""); }}
                  options={CATEGORIES}
                  title="Category"
                  className="rounded-xl"
                />
                <div className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${isOnlineCategory(chosenCategory) ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                  {isOnlineCategory(chosenCategory) ? (
                    <>📡 Online — conducted via video, no in-person meeting</>
                  ) : (
                    <>🌳 Outdoor — work at the residence exterior, no home entry</>
                  )}
                </div>
              </div>

              {!isOnlineCategory(chosenCategory) && (
                <div className="space-y-1.5">
                  <Label>Job address</Label>
                  <Input className="rounded-xl" placeholder="Where will the job happen?" value={form.address} onChange={(e) => set("address", e.target.value)} />
                  <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Only shared with the teen and their parent once a teen accepts and the parent approves.
                  </p>
                </div>
              )}

              <div className="bg-secondary rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum for {CATEGORY_LABELS[chosenCategory]} jobs</span>
                  <span className="font-bold text-foreground">{money(currentMin)}{form.price_model === "HOURLY" ? "/hr" : ""}</span>
                </div>
              </div>

              {categoryAgeReq != null && (
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-foreground">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    Teens age <span className="font-bold text-primary">{categoryAgeReq}+</span> in {form.state} can accept this job — that's who will see it on the job board.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Your price ({form.price_model === "HOURLY" ? "per hour" : "flat"})</Label>
                <Input
                  className="rounded-xl"
                  type="number"
                  min={currentMin}
                  max={MAX_UNIT_PRICE}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>

              {belowMin && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Your price of {money(form.price)} is below the {money(currentMin)}{form.price_model === "HOURLY" ? "/hr" : ""} minimum for {CATEGORY_LABELS[chosenCategory]} jobs. Please raise it to post.</span>
                </div>
              )}

              <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Platform fee (15%)</span><span>{money(platform_fee)}</span></div>
                <div className="flex justify-between"><span>Teen earns (85%)</span><span>{money(net_amount)}</span></div>
              </div>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => setPhase("form")}>
                Back
              </Button>
              <SlideToConfirm
                label="Slide to post job"
                loadingLabel="Posting..."
                disabled={belowMin}
                onConfirm={submit}
              />
            </div>
          </div>
        )}

        {phase === "form" && (
          <div className="space-y-4">
            <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              Our AI will read your description, pick the right category, and check it against your state's child labor laws before it goes live.
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input className="rounded-xl" maxLength={120} placeholder="e.g. Weed the front flower beds" value={form.title} onChange={(e) => set("title", e.target.value)} />
              {form.title.trim() && form.title.trim().length < 3 && <p className="text-xs text-destructive font-semibold">Title must be at least 3 characters.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea className="rounded-xl" maxLength={2000} placeholder="What needs to get done? Any tools or details teens should know about?" value={form.description} onChange={(e) => set("description", e.target.value)} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay ($)</Label>
                <Input className="rounded-xl" type="number" min="1" max={MAX_UNIT_PRICE} placeholder="25" value={form.price} onChange={(e) => set("price", e.target.value)} />
                {priceError && <p className="text-xs text-destructive font-semibold">{priceError}</p>}
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
            {/* AI price recommendation */}
            <div className="space-y-2">
              {priceRec ? (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary">AI suggested price</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-foreground font-heading">
                      {money(priceRec.recommended_price)}{form.price_model === "HOURLY" ? "/hr" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Fair range: {money(priceRec.min_price)}–{money(priceRec.max_price)}{form.price_model === "HOURLY" ? "/hr" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{priceRec.reason}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => set("price", String(priceRec.recommended_price))}>
                      Use {money(priceRec.recommended_price)}
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setPriceRec(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!form.title.trim() || !form.description.trim() || priceRecLoading}
                  onClick={fetchPriceRec}
                >
                  {priceRecLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                      Getting suggestion...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Get AI price suggestion
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>When (optional)</Label>
              <DateTimePicker value={form.scheduled_start} onChange={(v) => set("scheduled_start", v)} />
            </div>
            <Button className="w-full" disabled={!valid} onClick={reviewCategory}>
              Review & post
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}