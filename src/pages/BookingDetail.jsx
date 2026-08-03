import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Lock, MessageCircle, FileText, Repeat, Clock } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import TrustBadge from "@/components/grind/TrustBadge";
import ReviewDialog from "@/components/grind/ReviewDialog";
import ReviewCard from "@/components/grind/ReviewCard";
import { money } from "@/lib/grind";
import TipReleaseDialog from "@/components/grind/TipReleaseDialog";
import RescheduleDialog from "@/components/grind/RescheduleDialog";
import AlertParentButton from "@/components/grind/AlertParentButton";
import PaymentStatusTracker from "@/components/grind/PaymentStatusTracker";
import EarningsBreakdown from "@/components/grind/teen/EarningsBreakdown";
import JobHandshakePanel from "@/components/grind/JobHandshakePanel";
import CheckInTimeline from "@/components/grind/parent/CheckInTimeline";

export default function BookingDetail() {
  const { bookingId } = useParams();
  const { user } = useOutletContext();
  const [booking, setBooking] = useState(null);
  const [thread, setThread] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [handshakeError, setHandshakeError] = useState("");
  const autoPromptedRef = useRef(false);

  const load = useCallback(async () => {
    const [b, threads, reviewsRes] = await Promise.all([
      base44.entities.Booking.get(bookingId),
      base44.entities.MessageThread.filter({ booking_id: bookingId }),
      base44.functions.invoke("getReviews", { booking_id: bookingId }),
    ]);
    setBooking(b);
    setThread(threads[0] || null);
    const allReviews = reviewsRes.data?.reviews || [];
    setReviews(allReviews);
    setMyReview(allReviews.find((r) => r.is_mine) || null);
    setLoading(false);
  }, [bookingId, user.id]);

  useEffect(() => { load(); }, [load]);

  // Auto-prompt both sides to leave a review the moment a job is completed
  // and paid out — they can close it and revisit via the button below.
  useEffect(() => {
    if (!booking || !user) return;
    const canReview = booking.status === "completed" && !myReview && (user.id === booking.teen_user_id || user.id === booking.buyer_user_id);
    if (canReview && booking.payment_status === "released" && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      setReviewOpen(true);
    }
  }, [booking, myReview, user]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" /></div>;
  if (!booking) return <p className="text-center text-muted-foreground py-20">Booking not found.</p>;

  const isTeen = user.id === booking.teen_user_id;
  const isBuyer = user.id === booking.buyer_user_id;
  const isParent = user.id === booking.parent_user_id;
  const confirmedPlus = ["confirmed", "in_progress", "completed"].includes(booking.status);
  const addressVisible = isBuyer || isParent || (isTeen && confirmedPlus);

  const cancelBooking = async () => {
    setActing(true);
    setHandshakeError("");
    try {
      const res = await base44.functions.invoke("refundPayment", { bookingId: booking.id });
      if (res.data?.disputed) {
        setHandshakeError("This job already started — the cancellation is under review. Our team will resolve it within 1 business day.");
      }
    } catch (err) {
      setHandshakeError(err.response?.data?.error || "Couldn't cancel this booking.");
    }
    setActing(false);
    load();
  };

  const reportProblem = async () => {
    setActing(true);
    setHandshakeError("");
    try {
      await base44.functions.invoke("reportBookingProblem", { bookingId: booking.id });
      setHandshakeError("This booking has been flagged for our team to review.");
    } catch (err) {
      setHandshakeError(err.response?.data?.error || "Couldn't submit your report.");
    }
    setActing(false);
    load();
  };

  const canReview = booking.status === "completed" && !myReview && (isTeen || isBuyer);

  // Both sides must confirm — the server decides when the job actually
  // starts, completes, and when the escrowed payment is released.
  const startJob = async () => {
    setActing(true);
    setHandshakeError("");
    try {
      const res = await base44.functions.invoke("jobHandshake", { bookingId: booking.id, action: "start" });
      if (res.data?.url) {
        if (window.self !== window.top) {
          alert("Checkout only works from the published app. Open your app in a new tab to pay.");
          setActing(false);
          return;
        }
        window.location.href = res.data.url;
        return;
      }
    } catch (err) {
      setHandshakeError(err.response?.data?.error || "Couldn't start the job. Please try again.");
      setActing(false);
      return;
    }
    setActing(false);
    load();
  };

  const finishJob = async () => {
    // The neighbor finishes through the tip dialog so they can add a tip.
    if (isBuyer) {
      setTipOpen(true);
      return;
    }
    setActing(true);
    setHandshakeError("");
    try {
      await base44.functions.invoke("jobHandshake", { bookingId: booking.id, action: "finish" });
    } catch (err) {
      setHandshakeError(err.response?.data?.error || "Couldn't finish the job. Please try again.");
      setActing(false);
      return;
    }
    setActing(false);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{booking.listing_title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.teen_display_name} · booked by {booking.buyer_name}
            </p>
          </div>
          <p className="font-bold text-foreground text-lg">{money(booking.price_total)}</p>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.payment_status} />
          {booking.is_recurring && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-muted-foreground px-2.5 py-0.5 text-xs font-medium capitalize">
              <Repeat className="w-3 h-3" /> {booking.recurrence || "recurring"}
            </span>
          )}
          {booking.status === "in_progress" && <TrustBadge type="location_shared" />}
        </div>

        {booking.status === "pending_parent_approval" && (isTeen || isBuyer) && (
          <div className="mt-4 flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isTeen
                ? "Waiting for your parent to approve this job. If this is your first job, your parent may need to verify their identity and connect a bank account first — ask them to check their dashboard."
                : "Waiting for the teen's parent to approve this job. This is a safety requirement and usually takes less than a day."}
            </span>
          </div>
        )}

        <div className="mt-5 space-y-2.5 text-sm text-muted-foreground">
          {booking.scheduled_start && (
            <p className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {format(new Date(booking.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
            </p>
          )}
          {booking.is_physical !== false && (
            <p className="flex items-center gap-2">
              {addressVisible ? (
                <><MapPin className="w-4 h-4 text-muted-foreground" /> {booking.address || "Address not provided"}</>
              ) : (
                <><Lock className="w-4 h-4 text-muted-foreground" /> Address revealed after parent approval</>
              )}
            </p>
          )}
          {booking.notes && (
            <p className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" /> {booking.notes}
            </p>
          )}
          {booking.tip_amount > 0 && (
            <p className="flex items-center gap-2 font-medium text-foreground">
              💚 {money(booking.tip_amount)} tip from {booking.buyer_name}
            </p>
          )}
        </div>

        {isTeen && <div className="mt-4"><EarningsBreakdown booking={booking} /></div>}

        <PaymentStatusTracker booking={booking} />

        <CheckInTimeline booking={booking} />

        {booking.status === "in_progress" && isParent && (
          <div className="mt-4 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground font-medium">
            📍 {booking.teen_display_name}'s live location is being shared with you while this job is active.
          </div>
        )}
      </div>

      <div className="space-y-3">
        {thread && (isTeen || isBuyer || isParent) && (
          <Link to={`/messages/${thread.id}`}>
            <Button variant="outline" className="w-full rounded-xl">
              <MessageCircle className="w-4 h-4 mr-2" /> {isParent ? "Read messages" : "Message"}
            </Button>
          </Link>
        )}

        <JobHandshakePanel
          booking={booking}
          isTeen={isTeen}
          isBuyer={isBuyer}
          acting={acting}
          onStart={startJob}
          onFinish={finishJob}
        />
        {handshakeError && <p className="text-xs text-destructive font-medium text-center">{handshakeError}</p>}
        {isTeen && booking.status === "in_progress" && <AlertParentButton booking={booking} />}
        {(isTeen || isBuyer) && ["pending_parent_approval", "confirmed", "in_progress"].includes(booking.status) && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className={`rounded-xl ${isTeen || booking.status === "pending_parent_approval" ? "" : "col-span-2"}`}
              disabled={acting}
              onClick={() => setReschedOpen(true)}
            >
              Reschedule
            </Button>
            {(isTeen || booking.status === "pending_parent_approval") && (
              <Button
                variant="outline"
                className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                disabled={acting}
                onClick={cancelBooking}
              >
                Cancel & refund
              </Button>
            )}
          </div>
        )}
        {isBuyer && booking.status === "completed" && (
          <Link to={`/teens/${booking.teen_user_id}`}>
            <Button variant="outline" className="w-full rounded-xl">
              <Repeat className="w-4 h-4 mr-2" /> Book {booking.teen_display_name} again
            </Button>
          </Link>
        )}
        {canReview && booking.payment_status === "released" && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setReviewOpen(true)}>
            Leave a review
          </Button>
        )}
        {isParent && ["confirmed", "in_progress"].includes(booking.status) && !booking.dispute_flagged_at && (
          <Button
            variant="outline"
            className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            disabled={acting}
            onClick={cancelBooking}
          >
            Cancel & refund
          </Button>
        )}
        {(isTeen || isBuyer || isParent) && ["confirmed", "in_progress", "completed"].includes(booking.status) && !booking.dispute_flagged_at && (
          <Button
            variant="outline"
            className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            disabled={acting}
            onClick={reportProblem}
          >
            Report a problem
          </Button>
        )}
      </div>

      {booking.status === "completed" && reviews.length > 0 && (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} viewer={user} onChanged={load} />
            ))}
          </div>
        </div>
      )}

      {tipOpen && (
        <TipReleaseDialog
          open={tipOpen}
          onOpenChange={setTipOpen}
          booking={booking}
          onReleased={() => { setReviewOpen(true); load(); }}
        />
      )}
      {reschedOpen && (
        <RescheduleDialog
          open={reschedOpen}
          onOpenChange={setReschedOpen}
          booking={booking}
          actorIsBuyer={isBuyer}
          onDone={load}
        />
      )}
      {reviewOpen && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          booking={booking}
          author={user}
          direction={isBuyer ? "buyer_to_teen" : "teen_to_buyer"}
          onDone={load}
        />
      )}
    </div>
  );
}