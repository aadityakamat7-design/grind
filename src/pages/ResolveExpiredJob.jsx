import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, ArrowLeft, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import { money } from "@/lib/grind";
import { CATEGORY_LABELS } from "@/lib/grind";

export default function ResolveExpiredJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState(null); // 'refund' | 'credit'
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const j = await base44.entities.JobPost.get(jobId);
        setJob(j);
      } catch {
        setError("Couldn't load this job post.");
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const resolve = async (choice) => {
    setActing(true);
    setError("");
    try {
      await base44.functions.invoke("resolveExpiredJob", { jobId, choice });
      setDone(choice);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-card rounded-2xl border border-border p-6 h-40 skeleton-shimmer" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <PageHeader title="Resolved" />
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="font-bold text-foreground">
            {done === "refund" ? "Refund on its way" : "Credit added"}
          </p>
          <p className="text-sm text-muted-foreground">
            {done === "refund"
              ? `${money(job?.charge_amount)} is being refunded to your original payment method. It typically arrives in 3–5 business days.`
              : `${money(job?.charge_amount)} is now platform credit — it'll be applied automatically to your next job post.`}
          </p>
          <Button className="w-full" onClick={() => navigate("/jobs")}>Back to my job posts</Button>
        </div>
      </div>
    );
  }

  const alreadyResolved = job && job.payment_status !== "held";
  const notExpired = job && job.status !== "expired";

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/jobs")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to my job posts
      </button>

      <PageHeader
        title="Your job post expired"
        subtitle="No teen took this job within 7 days. Choose what happens to your held payment."
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {job && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {CATEGORY_LABELS[job.category] || job.category}
          </p>
          <h3 className="font-semibold text-foreground mt-0.5">{job.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Amount held: <span className="font-bold text-foreground">{money(job.charge_amount)}</span>
          </p>
        </div>
      )}

      {alreadyResolved ? (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This post has already been resolved.
          </p>
          <Button className="w-full mt-4" onClick={() => navigate("/jobs")}>Back to my job posts</Button>
        </div>
      ) : notExpired ? (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">This job post hasn't expired yet.</p>
          <Button className="w-full mt-4" onClick={() => navigate("/jobs")}>Back to my job posts</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            disabled={acting}
            onClick={() => resolve("refund")}
            className="w-full text-left bg-card rounded-2xl border border-border shadow-soft p-4 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Refund to my card</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {money(job?.charge_amount)} back to your original payment method in 3–5 business days.
                </p>
              </div>
            </div>
          </button>

          <button
            disabled={acting}
            onClick={() => resolve("credit")}
            className="w-full text-left bg-card rounded-2xl border border-border shadow-soft p-4 hover:border-primary/40 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-amber" />
              </div>
              <div>
                <p className="font-bold text-foreground">Keep as platform credit</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {money(job?.charge_amount)} applied automatically to your next job post — no waiting.
                </p>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}