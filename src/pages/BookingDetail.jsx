import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Lock, MessageCircle, FileText, Play, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import StatusBadge from "@/components/grind/StatusBadge";
import TrustBadge from "@/components/grind/TrustBadge";
import ReviewDialog from "@/components/grind/ReviewDialog";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function BookingDetail() {
  const { bookingId } = useParams();
  const { user } = useOutletContext();
  const [booking, setBooking] = useState(null);
  const [thread, setThread] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

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

  const releasePayment = async () => {
    setActing(true);
    await base44.entities.Booking.update(booking.id, { payment_status: "released" });
    await base44.entities.EarningsRecord.create({
      teen_user_id: booking.teen_user_id,
      booking_id: booking.id,
      listing_title: booking.listing_title,
      buyer_name: booking.buyer_name,
      amount: booking.price_total,
      net_amount: booking.net_amount,
      occurred_at: new Date().toISOString(),
      tax_year: new Date().getFullYear(),
    });
    await notify(booking.teen_user_id, { type: "payment", title: "You got paid!", body: `${money(booking.net_amount)} released for "${booking.listing_title}".`, link: `/teen/earnings` });
    await notify(booking.parent_user_id, { type: "payment", title: "Payout released", body: `${money(booking.net_amount)} from "${booking.listing_title}" is on its way to your account.`, link: `/parent/payouts` });
    setActing(false);
    setReviewOpen(true);
    load();
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
        {isBuyer && booking.status === "completed" && booking.payment_status === "held" && (
          <Button className="w-full rounded-xl" disabled={acting} onClick={releasePayment}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & release {money(booking.net_amount)} payment
          </Button>
        )}
        {isBuyer && booking.status === "pending_parent_approval" && (
          <Button
            variant="outline"
            className="w-full rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            disabled={acting}
            onClick={() => update({ status: "cancelled", payment_status: "refunded" })}
          >
            Cancel & refund
          </Button>
        )}
        {canReview && booking.payment_status === "released" && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setReviewOpen(true)}>
            Leave a review
          </Button>
        )}
      </div>

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