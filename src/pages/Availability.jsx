import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Clock, Loader2, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import AvailabilityCalendar from "@/components/grind/AvailabilityCalendar";
import ErrorRetry from "@/components/grind/ErrorRetry";
import { getHourLimits } from "@/lib/stateHourLimits";
import { getVerifiedAgeFromPrivate } from "@/lib/stateWorkRules";

// Dedicated Availability tab for teens and neighbors. Both pick weekly
// recurring time blocks on a calendar; the teen's grid is filtered to legal
// work hours (school hours and off-limit times are grayed out).
export default function Availability() {
  const { user } = useOutletContext();
  const isTeen = user.app_role === "teen";
  const [profile, setProfile] = useState(null);
  const [privateData, setPrivateData] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      if (isTeen) {
        const [profiles, priv] = await Promise.all([
          base44.entities.TeenProfile.filter({ user_id: user.id }),
          base44.entities.TeenPrivateData.filter({ user_id: user.id }),
        ]);
        const p = profiles[0] || null;
        setProfile(p);
        setPrivateData(priv[0] || null);
        setAvailability(p?.availability || []);
      } else {
        const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
        const p = profiles[0] || null;
        setProfile(p);
        setAvailability(p?.availability || []);
      }
    } catch (err) {
      console.error("Availability load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id, isTeen]);

  useEffect(() => { load(); }, [load]);

  const hourLimits = isTeen
    ? (getHourLimits(profile?.state || "CA", getVerifiedAgeFromPrivate(privateData)) || {
        earliestStartHour: 7, latestEndHour: 19, prohibitedDuringSchoolHours: true, schoolHoursStart: 8, schoolHoursEnd: 15,
      })
    : null;

  const save = async (next) => {
    if (!profile) return;
    const prev = availability;
    setAvailability(next); // optimistic
    setSaving(true);
    setSavedAt(null);
    try {
      await base44.entities[isTeen ? "TeenProfile" : "BuyerProfile"].update(profile.id, { availability: next });
      setSavedAt(Date.now());
    } catch (err) {
      console.error("Availability save failed:", err);
      setAvailability(prev); // revert
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 rounded-2xl skeleton-shimmer" />;
  if (error) return <ErrorRetry onRetry={load} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Availability"
        subtitle={isTeen
          ? "Tap the hours you're free to work. Neighbors see these when booking you."
          : "Tap when you're usually home and available for service."}
      />

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Weekly hours</span>
          </div>
          {saving ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
            </span>
          ) : savedAt ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          ) : null}
        </div>

        <AvailabilityCalendar value={availability} onChange={save} hourLimits={hourLimits} />

        {isTeen && (
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Grayed-out blocks are school hours or times that don't meet California's teen work-hour limits. Your changes save automatically.
          </p>
        )}
        {!isTeen && (
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Tap to mark the hours you're typically around for a teen to come do the work. Your changes save automatically.
          </p>
        )}
      </div>
    </div>
  );
}