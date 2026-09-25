import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useOutletContext, Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Lock, MessageCircle, FileText, Repeat, Clock, Video, Sun, MessageSquare, User, CheckCircle2, Receipt, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import { computeBookingBadge } from "@/lib/bookingStatus";
import ReviewDialog from "@/components/grind/ReviewDialog";
import ReviewCard from "@/components/grind/ReviewCard";
import { money } from "@/lib/grind";
import TipReleaseDialog from "@/components/grind/TipReleaseDialog";
import RescheduleDialog from "@/components/grind/RescheduleDialog";
import AlertParentButton from "@/components/grind/AlertParentButton";
import TeenLiveLocationSharing from "@/components/grind/teen/TeenLiveLocationSharing";
import PaymentStatusTracker from "@/components/grind/PaymentStatusTracker";
import { usePaymentConfirmation } from "@/hooks/usePaymentConfirmation";
import EarningsBreakdown from "@/components/grind/teen/EarningsBreakdown";
import JobHandshakePanel from "@/components/grind/JobHandshakePanel";
import OnlineSessionPanel from "@/components/grind/OnlineSessionPanel";
import OnlineCompletionDialog from "@/components/grind/OnlineCompletionDialog";
import CompletionPhotoUpload from "@/components/grind/CompletionPhotoUpload";
import DisputeDialog from "@/components/grind/DisputeDialog";
import RecurringSeriesManager from "@/components/grind/RecurringSeriesManager";
import BookDialog from "@/components/grind/BookDialog";
import BookingReceiptDialog from "@/components/grind/BookingReceiptDialog";
import ResumePaymentDialog from "@/components/grind/ResumePaymentDialog";
import CheckInTimeline from "@/components/grind/parent/CheckInTimeline";
import VideoSessionPanel from "@/components/grind/VideoSessionPanel";
import ErrorRetry from "@/components/grind/ErrorRetry";
import { useApprovalWithVerification } from "@/hooks/useApprovalWithVerification";

export default function BookingDetail() {
  const { id: bookingId } = useParams();
  const { user } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [thread, setThread] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [acting, setActing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [onlineCompletionOpen, setOnlineCompletionOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [bookAgainOpen, setBookAgainOpen] = useState(false);
  const [bookAgainListing, setBookAgainListing] = useState(null);
  const [handshakeError, setHandshakeError] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const autoPromptedRef = useRef(false);
  const receiptShownRef = useRef(false);

  // Success banner from Stripe Checkout redirect: ?started=1 (escrow paid)
  // or ?paid=1 (tip paid → payment released). Cleared after first show.
  const startedParam = searchParams.get("started") === "1";
  const paidParam = searchParams.get("paid") === "1";
  const confirmedParam = searchParams.get("confirmed") === "1";
  const [showReceipt, setShowReceipt] = useState(startedParam);

  // Escrow payment confirmation: when the buyer returns from Stripe Checkout
  // with ?paid=1, wait for the verified webhook to write payment_status 'held'
  // before showing the receipt / firing the receipt animation. The URL param
  // alone is not trusted — it can be present before the webhook has processed.
  const escrowConfirm = usePaymentConfirmation(bookingId, { enabled: paidParam });
  const escrowReceiptShownRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      // Booking is the critical call. When the user navigates here straight
      // from the booking dialog ("Pay later"), the booking may have just been
      // created and not yet readable — retry once after a brief delay before
      // showing the error screen.
      let bookingRes;
      const fetchBooking = () => base44.functions.invoke("getBookingDetail", { bookingId });
      try {
        bookingRes = await fetchBooking();
      } catch (firstErr) {
        try {
          await new Promise((r) => setTimeout(r, 1200));
          bookingRes = await fetchBooking();
        } catch (secondErr) {
          await new Promise((r) => setTimeout(r, 1500));
          bookingRes = await fetchBooking();
        }
      }
      setBooking(bookingRes.data?.booking || null);
      try {
        const threads = await base44.entities.MessageThread.filter({ booking_id: bookingId });
        setThread(threads[0] || null);
      } catch (e) { /* non-blocking */ }
      try {
        const reviewsRes = await base44.functions.invoke("getReviews", { booking_id: bookingId });
        const allReviews = reviewsRes.data?.reviews || [];
        setReviews(allReviews);
        setMyReview(allReviews.find((r) => r.is_mine) || null);
      } catch (e) { /* non-blocking */ }
    } catch (err) {
      console.error("BookingDetail load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [bookingId, user.id]);

  useEffect(() => { load(); }, [load]);

  // Clear the success params after showing the banner so a manual refresh
  // doesn't keep re-triggering it.
  useEffect(() => {
    if (startedParam) {
      setShowReceipt(true);
      const t = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [startedParam, setSearchParams]);

  // Fire the receipt animation only once the verified webhook has confirmed
  // the escrow payment (payment_status 'held' or beyond). Never off ?paid=1.
  useEffect(() => {
    if (paidParam && (escrowConfirm === "confirmed") && !escrowReceiptShownRef.current) {
      escrowReceiptShownRef.current = true;
      setShowReceipt(true);
      setReceiptOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [paidParam, escrowConfirm, setSearchParams]);

  // Auto-open the receipt dialog when the user arrives via ?confirmed=1
  // (parent just approved) — only once per page load.
  useEffect(() => {
    if (confirmedParam && booking?.status === "confirmed" && !receiptShownRef.current) {
      receiptShownRef.current = true;
      setReceiptOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [confirmedParam, booking, setSearchParams]);

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

  const { attempt: attemptApproval, acting: approvalActing } = useApprovalWithVerification(null, load);

  if (loading)
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl border border-border p-6 h-48 skeleton-shimmer" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border h-12 skeleton-shimmer" />)}
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;
  if (!booking) return <p className="text-center text-muted-foreground py-20">Booking not found.</p>;

  const isTeen = user.id === booking.teen_user_id;
  const isBuyer = user.id === booking.buyer_user_id;
  const isParent = user.id === booking.parent_user_id;
  const confirmedPlus = ["confirmed", "in_progress", "completed", "disputed"].includes(booking.status);
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

  // Retry the escrow payment after a decline — re-creates a Stripe Checkout
  // session for the same booking and redirects. Allowed because createCheckout
  // accepts payment_status 'payment_failed' as retryable.
  const retryEscrowPayment = async () => {
    setActing(true);
    setHandshakeError("");
    try {
      const res = await base44.functions.invoke("createCheckout", { bookingId: booking.id, origin: window.location.origin });
      if (res.data?.url) {
        if (window.self !== window.top) {
          alert("Checkout only works from the published app. Open your app in a new tab to pay.");
          setActing(false);
          return;
        }
        window.location.href = res.data.url;
        return;
      }
      load();
    } catch (err) {
      setHandshakeError(err.response?.data?.error || "Couldn't start checkout. Please try again.");
      setActing(false);
    }
  };

  const canReview = booking.status === "completed" && !myReview && (isTeen || isBuyer);

  // The server controls all state transitions — start, finish (with photos),
  // confirm, dispute, and escrow release.
  const startJob = async () => {
    setActing(true);
    setHandshakeError("");
    try {
      const res = await base44.functions.invoke("jobHandshake", { bookingId: booking.id, action: "start", origin: window.location.origin });
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

  const finishJob = () => booking.delivery_mode === "online" ? setOnlineCompletionOpen(true) : setPhotoUploadOpen(true);
  const confirmJob = () => setTipOpen(true);
  const disputeJob = () => setDisputeOpen(true);

  return (
    <div className="space-y-5">
      {paidParam && escrowConfirm === "confirming" && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Confirming your payment…</p>
            <p className="text-xs text-muted-foreground mt-0.5">Securing your payment in escrow. This usually takes a few seconds.</p>
          </div>
        </div>
      )}
      {paidParam && escrowConfirm === "timeout" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700">Still processing</p>
            <p className="text-xs text-amber-600 mt-0.5">We received your payment but are still confirming it with the bank. We'll email you once it's confirmed — no action needed.</p>
          </div>
        </div>
      )}
      {paidParam && escrowConfirm === "failed" && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-700">Payment couldn't be confirmed</p>
            <p className="text-xs text-rose-600 mt-0.5 mb-2">Your card may have been declined. You can try again.</p>
            <Button size="sm" variant="outline" disabled={acting} onClick={retryEscrowPayment}>Try paying again</Button>
          </div>
        </div>
      )}
      {showReceipt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Receipt sent — booking confirmed
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {booking?.payment_status === "released"
                ? "Payment released to the teen. A receipt and notification have been sent."
                : booking?.payment_status === "held"
                  ? "Payment held in escrow. A receipt has been sent and the teen has been notified to start the job."
                  : "Your booking is confirmed."}
            </p>
          </div>
        </div>
      )}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{booking.listing_title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.teen_display_name} · booked by {booking.buyer_name}
            </p>
          </div>
          <p className="font-bold text-foreground text-lg">
            {isBuyer ? money(booking.price_total) : money(booking.net_amount || 0)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusBadge status={computeBookingBadge(booking)} />
          {booking.is_recurring && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-muted-foreground px-2.5 py-0.5 text-xs font-medium capitalize">
              <Repeat className="w-3 h-3" /> {booking.recurrence || "recurring"}
            </span>
          )}
          {booking.delivery_mode === "online" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
              <Video className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
              <Sun className="w-3 h-3" /> Outdoor
            </span>
          )}

        </div>

        {booking.status === "pending_parent_approval" && (isTeen || isBuyer) && (
          <div className="mt-4 flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {booking.payment_status !== "held"
                ? "Waiting for the neighbor's payment to be confirmed."
                : isTeen
                  ? "Waiting for your parent to approve. Ask them to check their dashboard."
                  : "Waiting for the parent to approve — usually within a day."}
            </span>
          </div>
        )}
        {isParent && booking.status === "pending_parent_approval" && (
          booking.payment_status === "held" ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                disabled={approvalActing === booking.id}
                onClick={() => attemptApproval(booking, false)}
              >
                Deny & refund
              </Button>
              <Button
                className="rounded-xl"
                disabled={approvalActing === booking.id}
                onClick={() => attemptApproval(booking, true)}
              >
                Approve
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Waiting for the neighbor's payment to be confirmed before you can approve.</span>
            </div>
          )
        )}

        <div className="mt-5 space-y-2.5 text-sm text-muted-foreground">
          {booking.scheduled_start && (
            <p className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {format(new Date(booking.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
            </p>
          )}
          {booking.delivery_mode === "online" ? (
            <VideoSessionPanel booking={booking} confirmedPlus={confirmedPlus} />
          ) : (
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
          {booking.teen_pitch && (isBuyer || isParent) && (
            <div className="mt-3 bg-secondary/60 border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                {booking.teen_display_name}'s pitch
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">{booking.teen_pitch}</p>
              <Link to={`/teens/${booking.teen_user_id}`} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline">
                <User className="w-3.5 h-3.5" /> View {booking.teen_display_name}'s profile
              </Link>
            </div>
          )}
          {booking.tip_amount > 0 && (
            <p className="flex items-center gap-2 font-medium text-foreground">
              💚 {money(booking.tip_amount)} tip from {booking.buyer_name}
            </p>
          )}
        </div>

        {isTeen && <div className="mt-4"><EarningsBreakdown booking={booking} /></div>}

        <PaymentStatusTracker booking={booking} isBuyer={isBuyer} isTeen={isTeen} isParent={isParent} />

        <CheckInTimeline booking={booking} />

      </div>

      {booking.recurring_series_id && (
        <RecurringSeriesManager booking={booking} user={user} onChanged={load} />
      )}

      <div className="space-y-3">
        {thread && (isTeen || isBuyer || isParent) && (
          <Link to={`/messages/${thread.id}`}>
            <Button variant="outline" className="w-full rounded-xl">
              <MessageCircle className="w-4 h-4 mr-2" /> {isParent ? "Read messages" : "Message"}
            </Button>
          </Link>
        )}

        {isBuyer && booking.status === "payment_pending" && (booking.payment_status === "unpaid" || booking.payment_status === "payment_failed") && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Payment incomplete. Complete your payment to request this booking.</span>
          </div>
        )}

        {isBuyer && booking.status === "confirmed" && !booking.buyer_started_at && !booking.teen_started_at && (booking.charge_amount ?? booking.price_total) > 0 && (
          <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-muted-foreground bg-secondary border border-border">
            <Lock className="w-4 h-4 shrink-0" />
            Waiting for {booking.teen_display_name} to confirm.
          </div>
        )}
        {booking.delivery_mode === "online" && ["in_progress", "completed", "disputed"].includes(booking.status) ? (
          <OnlineSessionPanel
            booking={booking}
            isTeen={isTeen}
            isBuyer={isBuyer}
            isParent={isParent}
            acting={acting}
            onFinish={finishJob}
            onConfirm={confirmJob}
            onDispute={disputeJob}
          />
        ) : (
          <JobHandshakePanel
            booking={booking}
            isTeen={isTeen}
            isBuyer={isBuyer}
            isParent={isParent}
            acting={acting}
            onStart={startJob}
            onFinish={finishJob}
            onConfirm={confirmJob}
            onDispute={disputeJob}
            onPaymentSuccess={() => setTimeout(() => load(), 1500)}
            onPaymentError={(msg) => setHandshakeError(msg)}
          />
        )}
        {handshakeError && <p className="text-xs text-destructive font-medium text-center">{handshakeError}</p>}
        {isTeen && booking.status === "in_progress" && <TeenLiveLocationSharing booking={booking} />}
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
          <Button variant="outline" className="w-full rounded-xl" onClick={async () => {
            try {
              const listing = await base44.entities.Listing.get(booking.listing_id);
              if (listing) { setBookAgainListing(listing); setBookAgainOpen(true); }
            } catch { /* silent */ }
          }}>
            <Repeat className="w-4 h-4 mr-2" /> Book again
          </Button>
        )}
        {canReview && booking.payment_status === "released" && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setReviewOpen(true)}>
            Leave a review
          </Button>
        )}
        {["confirmed", "in_progress", "completed"].includes(booking.status) && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setReceiptOpen(true)}>
            <Receipt className="w-4 h-4 mr-2" /> View receipt
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
      {photoUploadOpen && (
        <CompletionPhotoUpload
          open={photoUploadOpen}
          onOpenChange={setPhotoUploadOpen}
          booking={booking}
          onDone={load}
        />
      )}
      {onlineCompletionOpen && (
        <OnlineCompletionDialog
          open={onlineCompletionOpen}
          onOpenChange={setOnlineCompletionOpen}
          booking={booking}
          onDone={load}
        />
      )}
      {disputeOpen && (
        <DisputeDialog
          open={disputeOpen}
          onOpenChange={setDisputeOpen}
          booking={booking}
          onDone={load}
        />
      )}
      {bookAgainOpen && bookAgainListing && (
        <BookDialog
          open={bookAgainOpen}
          onOpenChange={setBookAgainOpen}
          listing={bookAgainListing}
          buyer={user}
          buyerProfile={{ address: booking.address }}
        />
      )}
      <BookingReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        booking={booking}
        user={user}
      />

      {isBuyer && booking.status === "payment_pending" && (booking.payment_status === "unpaid" || booking.payment_status === "payment_failed") && (
        <ResumePaymentDialog booking={booking} user={user} onResolved={load} />
      )}
    </div>
  );
}