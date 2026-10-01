import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, CalendarDays, FileText, Lock, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import { money } from "@/lib/grind";
import { useApprovalWithVerification } from "@/hooks/useApprovalWithVerification";
import ErrorRetry from "@/components/grind/ErrorRetry";
import ListingApprovalCard from "@/components/grind/parent/ListingApprovalCard";

// Everything a teen does that needs a parent's OK: the services they post (hidden
// until approved) and the jobs they take (payment held until approved).
export default function ParentApprovals() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState(null);
  const [threadByBooking, setThreadByBooking] = useState({});

  const load = useCallback(async () => {
    try {
      setError(false);
      const [data, profiles, links] = await Promise.all([
        base44.entities.Booking.filter(
          { parent_user_id: user.id, status: "pending_parent_approval" },
          "-created_date"
        ),
        base44.entities.ParentProfile.filter({ user_id: user.id }),
        base44.entities.ParentTeenLink.filter({ parent_user_id: user.id, status: "confirmed" }),
      ]);
      // Only show bookings where the neighbor's escrow payment is confirmed —
      // parents cannot approve until payment is held.
      const heldPending = data.filter((b) => b.payment_status === "held");
      setPending(heldPending);
      setProfile(profiles[0] || null);

      // The parent talks to the neighbor in the booking's own screened
      // conversation, so the approval card links straight into it.
      if (heldPending.length) {
        try {
          const threads = await base44.entities.MessageThread.filter({
            booking_id: { $in: heldPending.map((b) => b.id) },
          });
          setThreadByBooking(Object.fromEntries(threads.map((t) => [t.booking_id, t.id])));
        } catch (err) {
          console.error("approval threads:", err?.message);
        }
      }

      const teenIds = links.map((l) => l.teen_user_id).filter(Boolean);
      if (teenIds.length === 0) {
        setPendingListings([]);
      } else {
        const listings = await base44.entities.Listing.filter(
          { teen_user_id: { $in: teenIds }, parent_approval_status: "pending" },
          "-created_date"
        );
        setPendingListings(listings);
      }
    } catch (err) {
      console.error("ParentApprovals load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubBookings = base44.entities.Booking.subscribe(() => load());
    const unsubListings = base44.entities.Listing.subscribe(() => load());
    return () => {
      unsubBookings();
      unsubListings();
    };
  }, [load]);

  const { attempt, acting } = useApprovalWithVerification(profile, load);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSetup = params.get("setup");
    if (!hasSetup) return;
    if (loading) return;
    if (pending.length === 0 && pendingListings.length === 0) {
      window.location.replace("/parent");
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [pending, pendingListings, loading]);

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-5 h-32 skeleton-shimmer" />)}
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const nothingWaiting = pending.length === 0 && pendingListings.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Approvals" subtitle="Every service and every job needs your OK." />

      {nothingWaiting ? (
        <EmptyState icon={ShieldCheck} title="All clear" subtitle="Nothing is waiting for your approval right now." />
      ) : (
        <div className="space-y-6">
          {pendingListings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-bold text-foreground">
                Services waiting for approval ({pendingListings.length})
              </h2>
              {pendingListings.map((l) => (
                <ListingApprovalCard key={l.id} listing={l} onDecided={load} />
              ))}
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-bold text-foreground">
                Jobs waiting for approval ({pending.length})
              </h2>
              {pending.map((b) => {
                return (
                  <div key={b.id} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground text-[15px]">{b.listing_title}</h3>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {b.teen_display_name} · booked by {b.buyer_name}
                        </p>
                      </div>
                      <p className="font-extrabold text-foreground text-[16px] shrink-0">{money(b.price_total)}</p>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                      {b.scheduled_start && (
                        <p className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-muted-foreground/60" />
                          {format(new Date(b.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
                        </p>
                      )}
                      {b.address && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground/60" />
                          {b.address}
                        </p>
                      )}
                      {b.notes && (
                        <p className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground/60 mt-0.5" />
                          {b.notes}
                        </p>
                      )}
                    </div>

                    {b.teen_pitch && (
                      <div className="mt-3 bg-secondary/60 border border-border rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          Why {b.teen_display_name} wants this job
                        </p>
                        <p className="text-[13px] text-foreground/90 leading-relaxed">{b.teen_pitch}</p>
                        <Link to={`/teens/${b.teen_user_id}`} className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold text-primary hover:underline">
                          <User className="w-3.5 h-3.5" /> View {b.teen_display_name}'s profile
                        </Link>
                      </div>
                    )}

                    {b.intro_message && (
                      <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                          Introduction from {b.buyer_name}
                        </p>
                        <p className="text-[13px] text-foreground/90 leading-relaxed">{b.intro_message}</p>
                      </div>
                    )}

                    {threadByBooking[b.id] && (
                      <Link
                        to={`/messages/${threadByBooking[b.id]}`}
                        className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-primary hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message the neighbor
                      </Link>
                    )}

                    <p className="text-[12px] text-muted-foreground/70 mt-3">
                      Payment is held safely. Approving confirms the booking; denying refunds the neighbor.
                    </p>
                    {profile?.connect_status !== "active" && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-700 mt-3">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          <strong className="font-semibold">Earnings will be locked.</strong> Your teen can do this job, but their earnings won't be withdrawable until you{" "}
                          <a href="/parent/payouts" className="underline font-semibold">connect your bank account</a>.
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Button
                        variant="outline"
                        className="rounded-full h-11"
                        disabled={acting === b.id}
                        onClick={() => attempt(b, false)}
                      >
                        Deny & refund
                      </Button>
                      <Button className="rounded-full h-11" disabled={acting === b.id} onClick={() => attempt(b, true)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}