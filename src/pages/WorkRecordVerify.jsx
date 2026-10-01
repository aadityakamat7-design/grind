import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import BlockworkLogo from "@/components/BlockworkLogo";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

// Public verification page — a school, coach, or employer opens
// blockwork.online/verify/{recordId} and confirms the record is real.
// No sign-in required, and it's kept out of search engines.
export default function WorkRecordVerify() {
  const { recordId } = useParams();
  const [state, setState] = useState({ loading: true });
  const [error, setError] = useState("");

  // Always noindex — these pages carry a minor's activity.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("workRecord", { action: "verify", recordId });
        setState({ loading: false, ...(res.data || {}) });
      } catch (err) {
        setError(err.response?.data?.error || "Couldn't check that record.");
        setState({ loading: false, found: false });
      }
    })();
  }, [recordId]);

  const record = state.record;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Verified Work Record · Blockwork"
        description="Confirm a teen's Blockwork Work Record — real, parent-approved, paid-out neighborhood jobs."
        path={`/verify/${recordId}`}
      />
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center gap-2.5">
          <BlockworkLogo size={32} />
          <span className="font-bold text-lg tracking-tight text-foreground">Blockwork</span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-10">
        {state.loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !state.found ? (
          <div className="text-center py-16 space-y-3">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Record not found</h1>
            <p className="text-sm text-muted-foreground">
              {error || "This verification link doesn't match a Blockwork Work Record. Check the code and try again."}
            </p>
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">Back to Blockwork</Link>
          </div>
        ) : state.enabled === false ? (
          <div className="text-center py-16 space-y-3">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">This record is private</h1>
            <p className="text-sm text-muted-foreground">
              {state.teen_display_name || "This student"} turned off public verification. The record itself is still
              valid — ask them to share the PDF instead.
            </p>
            <Link to="/" className="text-sm font-semibold text-primary hover:underline">Back to Blockwork</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{record.teen_display_name}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[record.city, record.state].filter(Boolean).join(", ")} · Record {record.record_id}
                </p>
                <p className="text-sm font-semibold text-emerald-700 mt-2">
                  Verified by Blockwork
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Jobs completed", value: record.jobs_completed },
                { label: "Hours worked", value: record.hours_total },
                { label: "Average rating", value: record.avg_rating ? `${Number(record.avg_rating).toFixed(1)}/5` : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl border border-border p-4 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-foreground">
              Every job on this record was completed through Blockwork, approved by the teen's parent, and paid out.
            </div>

            {record.categories?.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground text-sm mb-2">Work categories</h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {record.categories.map((c) => c.replace(/_/g, " ")).join(" · ")}
                </p>
              </div>
            )}

            <div>
              <h2 className="font-bold text-foreground text-sm mb-2">Completed jobs</h2>
              <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                {record.jobs?.slice(0, 40).map((job, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {job.date} · {job.neighbor_label}
                        {job.category ? ` · ${job.category.replace(/_/g, " ")}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground shrink-0">{job.hours}h</p>
                  </div>
                ))}
                {(!record.jobs || record.jobs.length === 0) && (
                  <p className="p-3 text-sm text-muted-foreground">No completed jobs yet.</p>
                )}
              </div>
            </div>

            {record.reviews?.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground text-sm mb-2">What neighbors said</h2>
                <div className="space-y-2">
                  {record.reviews.map((r, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border p-3">
                      <p className="text-xs font-bold text-amber-600">{r.rating}/5</p>
                      <p className="text-sm text-foreground/90 mt-1">"{r.quote}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Neighborhood names and addresses are never included. This page is excluded from search engines.
              Generated {record.generated_at ? new Date(record.generated_at).toLocaleDateString("en-US") : ""}.
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}