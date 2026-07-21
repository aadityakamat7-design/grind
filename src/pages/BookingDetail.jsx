import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Lock, MessageCircle, FileText, Play, CheckCircle2, Repeat } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import TrustBadge from "@/components/grind/TrustBadge";
import ReviewDialog from "@/components/grind/ReviewDialog";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";
import { startCheckout } from "@/lib/stripeCheckout";
import TipReleaseDialog from "@/components/grind/TipReleaseDialog";
import RescheduleDialog from "@/components/grind/RescheduleDialog";
import AlertParentButton from "@/components/grind/AlertParentButton";

export default function BookingDetail() {
  const { bookingId } = useParams();
  const { user } = useOutletContext();
  const [booking, setBooking] = useState(null);
  const [thread, setThread] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);

  const load = useCallback(async () => {
    const [b, threads, reviews] = await Promise.all([
      base44.entities.Booking.get(bookingId),
      base44.entities.MessageThread.filter({ booking_id: bookingId }),
      base44.entities.Review.filter({ booking_id: bookingId, author_id: user.id }),
    ]);
    setBooking(b);
    setThread(threads[0] || null);
    setMyReview(reviews[0] || null);
    setLoading(false);
  }, [bookingId, user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!booking) return <p className="text-center text-slate-500 py-20">Booking not found.</p>;

  const isTeen = user.id === booking.teen_user_id;
  const isBuyer = user.id === booking.buyer_user_id;
  const isParent = user.id === booking.parent_user_id;
  const confirmedPlus = ["confirmed", "in_progress", "completed"].includes(booking.status);
  const addressVisible = isBuyer || isParent || (isTeen && confirmedPlus);

  const update = async (data) => {
    setActing(true);
    await base44.entities.Booking.update(booking.id, data);
    setActing(false);
    load();
  };

  const cancelBooking = async () => {
    setActing(true);
    await base44.functions.invoke("refundPayment", { bookingId: booking.id });
    const otherId = isBuyer ? booking.teen_user_id : booking.buyer_user_id;
    await notify(otherId, { type: "booking", title: "Booking cancelled", body: `"${booking.listing_title}" was cancelled and any held payment was refunded.`, link: `/bookings/${booking.id}` });
    setActing(false);
    load();
  };

  const payNow = async () => {
    setActing(true);
    const result = await startCheckout(booking.id);
    setActing(false);
    if (result.paid) load();
  };

  const canReview = booking.status === "completed" && !myReview && (isTeen || isBuyer);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{booking.listing_title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {booking.teen_display_name} · booked by {booking.buyer_name}
            </p>
          </div>
          <p className="font-extrabold text-slate-900 text-lg">{money(booking.price_total)}</p>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.payment_status} />
          {booking.is_recurring && (
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-semibold capitalize">
              <Repeat className="w-3 h-3" /> {booking.recurrence || "recurring"}
            </span>
          )}
          {booking.status === "in_progress" && <TrustBadge type="location_shared" />}
        </div>

        <div className="mt-5 space-y-2.5 text-sm text-slate-600">
          {booking.scheduled_start && (
            <p className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {format(new Date(booking.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
            </p>
          )}
          <p className="flex items-center gap-2">
            {addressVisible ? (
              <><MapPin className="w-4 h-4 text-slate-400" /> {booking.address}</>
            ) : (
              <><Lock className="w-4 h-4 text-slate-400" /> Address revealed after parent approval</>
            )}
          </p>
          {booking.notes && (
            <p className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5" /> {booking.notes}
            </p>
          )}
          {booking.tip_amount > 0 && (
            <p className="flex items-center gap-2 font-semibold text-emerald-600">
              💚 {money(booking.tip_amount)} tip from {booking.buyer_name}
            </p>
          )}
        </div>

        {booking.status === "in_progress" && isParent && (
          <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-semibold">
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

        {isBuyer && booking.payment_status === "unpaid" && booking.status !== "cancelled" && (
          <Button className="w-full rounded-xl" disabled={acting} onClick={payNow}>
            <Lock className="w-4 h-4 mr-2" /> Complete payment — {money(booking.charge_amount ?? booking.price_total)}
          </Button>
        )}
        {isTeen && booking.status === "confirmed" && (
          <Button className="w-full rounded-xl" disabled={acting} onClick={() => update({ status: "in_progress" })}>
            <Play className="w-4 h-4 mr-2" /> Start job — share location with parent
          </Button>
        )}
        {isTeen && booking.status === "in_progress" && (
          <Button className="w-full rounded-xl" disabled={acting} onClick={() => update({ status: "completed" })}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark job complete
          </Button>
        )}
        {isTeen && booking.status === "in_progress" && <AlertParentButton booking={booking} />}
        {isBuyer && booking.status === "completed" && booking.payment_status === "held" && (
          <Button className="w-full rounded-xl" disabled={acting} onClick={() => setTipOpen(true)}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm completion & release payment
          </Button>
        )}
        {(isTeen || isBuyer) && ["pending_parent_approval", "confirmed"].includes(booking.status) && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-xl" disabled={acting} onClick={() => setReschedOpen(true)}>
              Reschedule
            </Button>
            <Button
              variant="outline"
              className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              disabled={acting}
              onClick={cancelBooking}
            >
              Cancel & refund
            </Button>
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
      </div>

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