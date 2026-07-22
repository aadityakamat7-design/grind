import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import { computeFees } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function AcceptJobButton({ job, teen, onAccepted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setSaving(true);
    setError("");
    const [profiles, links] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: teen.id }),
      base44.entities.ParentTeenLink.filter({ teen_user_id: teen.id }),
    ]);
    const profile = profiles[0];
    const link = links[0];
    if (profile?.status !== "active") {
      setError("Your account isn't live yet — your parent must verify their ID and confirm your link before you can take jobs.");
      setSaving(false);
      return;
    }
    if (job.ai_minimum_age && profile?.age && profile.age < job.ai_minimum_age) {
      setError(`This job requires workers age ${job.ai_minimum_age}+ under ${job.state} law.`);
      setSaving(false);
      return;
    }
    if (job.payment_status !== "held") {
      setError("This job's posting fee hasn't been paid yet, so it can't be taken.");
      setSaving(false);
      return;
    }
    const { platform_fee, net_amount } = job.platform_fee != null ? job : computeFees(job.price);
    const booking = await base44.entities.Booking.create({
      listing_title: job.title,
      teen_user_id: teen.id,
      teen_display_name: profile?.display_name || teen.full_name,
      parent_user_id: link?.parent_user_id,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      scheduled_start: job.scheduled_start || undefined,
      notes: job.description,
      price_total: job.price,
      charge_amount: job.charge_amount ?? job.price,
      platform_fee,
      net_amount,
      payment_status: "held",
      stripe_payment_intent_id: job.stripe_payment_intent_id,
      status: "pending_parent_approval",
    });
    await base44.entities.JobPost.update(job.id, {
      status: "assigned",
      assigned_teen_user_id: teen.id,
      assigned_teen_name: profile?.display_name || teen.full_name,
      booking_id: booking.id,
    });
    await base44.entities.MessageThread.create({
      booking_id: booking.id,
      listing_title: job.title,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      teen_user_id: teen.id,
      teen_display_name: profile?.display_name || teen.full_name,
      parent_user_id: link?.parent_user_id,
      participant_ids: [job.buyer_user_id, teen.id, link?.parent_user_id].filter(Boolean),
      is_confirmed: false,
    });
    if (link?.parent_user_id) {
      await notify(link.parent_user_id, {
        type: "approval",
        title: "New job needs your approval",
        body: `${profile?.display_name || "Your teen"} wants to take "${job.title}" for ${job.buyer_name}.`,
        link: `/bookings/${booking.id}`,
      });
    }
    await notify(job.buyer_user_id, {
      type: "booking",
      title: "A teen took your job!",
      body: `${profile?.display_name || "A teen"} accepted "${job.title}" — pending parent approval.`,
      link: `/bookings/${booking.id}`,
    });
    setSaving(false);
    onAccepted?.();
  };

  return (
    <div className="space-y-2">
      <Button className="w-full rounded-xl" disabled={saving} onClick={accept}>
        <Hand className="w-4 h-4 mr-2" /> {saving ? "Taking job..." : "Take this job"}
      </Button>
      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}