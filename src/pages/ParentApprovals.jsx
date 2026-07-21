import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, CalendarDays, FileText } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function ParentApprovals() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    const [data, profiles] = await Promise.all([
      base44.entities.Booking.filter(
        { parent_user_id: user.id, status: "pending_parent_approval" },
        "-created_date"
      ),
      base44.entities.ParentProfile.filter({ user_id: user.id }),
    ]);
    setPending(data);
    setProfile(profiles[0] || null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const decide = async (booking, approve) => {
    setActing(booking.id);
    await base44.entities.Booking.update(booking.id, {
      status: approve ? "confirmed" : "denied",
      payment_status: approve ? "held" : "refunded",
    });
    const threads = await base44.entities.MessageThread.filter({ booking_id: booking.id });
    if (threads[0] && approve) {
      await base44.entities.MessageThread.update(threads[0].id, { is_confirmed: true });
    }
    const verb = approve ? "approved" : "denied";
    await notify(booking.buyer_user_id, { type: "approval", title: `Booking ${verb}`, body: `"${booking.listing_title}" with ${booking.teen_display_name} was ${verb} by their parent.`, link: `/bookings/${booking.id}` });
    await notify(booking.teen_user_id, { type: "approval", title: `Booking ${verb}`, body: `Your parent ${verb} "${booking.listing_title}".`, link: `/bookings/${booking.id}` });
    setActing(null);
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Every booking needs your OK before it's confirmed.</p>
      </div>

      {!profile?.is_identity_verified && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Identity verification required</p>
            <p className="text-xs text-amber-800 mt-0.5">
              You need to verify your identity before you can approve bookings.{" "}
              <Link to="/parent/payouts" className="font-bold underline">Verify now</Link>
            </p>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="All clear" subtitle="No bookings are waiting for your approval." />
      ) : (
        <div className="space-y-4">
          {pending.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{b.listing_title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.teen_display_name} · booked by {b.buyer_name}
                  </p>
                </div>
                <p className="font-extrabold text-slate-900">{money(b.price_total)}</p>
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {b.scheduled_start && (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {format(new Date(b.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
                  </p>
                )}
                {b.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {b.address}
                  </p>
                )}
                {b.notes && (
                  <p className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    {b.notes}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Payment of {money(b.price_total)} is already held in escrow. Denying refunds the neighbor automatically.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  variant="outline"
                  className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  disabled={acting === b.id || !profile?.is_identity_verified}
                  onClick={() => decide(b, false)}
                >
                  Deny & refund
                </Button>
                <Button className="rounded-xl" disabled={acting === b.id || !profile?.is_identity_verified} onClick={() => decide(b, true)}>
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}