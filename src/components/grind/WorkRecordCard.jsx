import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Award, Download, Loader2, Link2, ShieldCheck, QrCode } from "lucide-react";
import { buildWorkRecordPdf, verificationUrl } from "@/lib/workRecordPdf";

// The teen's Verified Work Record — a downloadable PDF for college and job
// applications, plus a public verification link a school or employer can open.
//
// Every number comes from a completed, paid-out booking. Nothing is typed in.
export default function WorkRecordCard({ teenUserId, canToggle = true }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await base44.functions.invoke("workRecord", {
        action: "get",
        teenUserId: teenUserId || undefined,
      });
      setRecord(res.data?.record || null);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't load the work record.");
    } finally {
      setLoading(false);
    }
  }, [teenUserId]);

  useEffect(() => { load(); }, [load]);

  const download = async () => {
    if (!record) return;
    setDownloading(true);
    setError("");
    try {
      await buildWorkRecordPdf(record);
    } catch (err) {
      console.error("work record pdf:", err);
      setError("Couldn't build the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const setVisibility = async (enabled) => {
    setSaving(true);
    try {
      await base44.functions.invoke("workRecord", {
        action: "set_visibility",
        teenUserId: teenUserId || undefined,
        enabled,
      });
      setRecord((prev) => (prev ? { ...prev, enabled } : prev));
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't change that.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />;
  }
  if (!record) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <p className="text-sm text-muted-foreground">{error || "No work record yet."}</p>
      </div>
    );
  }

  const hasJobs = (record.jobs_completed || 0) > 0;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-foreground">Work Record</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            A verified history of every real job — add it to college applications, résumés, and job applications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Jobs", value: record.jobs_completed || 0 },
          { label: "Hours", value: record.hours_total || 0 },
          { label: "Rating", value: record.avg_rating ? Number(record.avg_rating).toFixed(1) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-secondary p-3 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="font-display text-lg font-bold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground/80 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        Verified by Blockwork — every job was approved by a parent and paid out.
      </p>

      <Button className="w-full rounded-full" disabled={downloading || !hasJobs} onClick={download}>
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> Download my Work Record (PDF)</>}
      </Button>
      {!hasJobs && (
        <p className="text-[11px] text-muted-foreground text-center">
          The record fills in as soon as your first job is completed and paid.
        </p>
      )}

      <div className="rounded-xl border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Public verification link
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Lets a school or employer confirm your record. Turn it off any time.
            </p>
          </div>
          {canToggle && (
            <Switch checked={record.enabled !== false} disabled={saving} onCheckedChange={setVisibility} />
          )}
        </div>

        {record.enabled !== false ? (
          <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
            <QrCode className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Record ID {record.record_id}</p>
              <p className="text-[11px] font-medium text-primary truncate">
                blockwork.online/verify/{record.record_id}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            The public link is off. The PDF still works.
          </p>
        )}
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        Neighbors appear as "Neighbor in {record.city || "your city"}, {record.state || "CA"}" — never names or addresses.
      </p>
    </div>
  );
}

export { verificationUrl };