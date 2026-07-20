import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { money } from "@/lib/grind";
import StatusBadge from "@/components/grind/StatusBadge";
import TrustBadge from "@/components/grind/TrustBadge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock } from "lucide-react";
import { format } from "date-fns";

export default function TeenHome({ user }) {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [profiles, bks] = await Promise.all([
        base44.entities.TeenProfile.filter({ created_by_id: user.id }),
        base44.entities.Booking.filter({ teen_user_id: user.id }, "-created_date", 50),
      ]);
      setProfile(profiles[0] || null);
      setBookings(bks);
      setEarnings(
        bks.filter((b) => b.status === "completed").reduce((s, b) => s + (b.price_total - (b.platform_fee || 0)), 0)
      );
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const upcoming = bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
  const pending = bookings.filter((b) => b.status === "pending_parent_approval");

  const copy = () => {
    navigator.clipboard.writeText(profile?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Hey, {profile?.display_name?.split(" ")[0] || "there"} 👋</h1>
        <p className="text-muted-foreground text-sm">Here's what's happening in your hustle.</p>
      </div>

      {profile?.status === "pending_parent" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="font-heading font-bold text-amber-900 mb-1">⏳ Waiting on your parent</div>
          <p className="text-sm text-amber-800 mb-3">
            You can't publish listings or take bookings until a parent links up with your invite code:
          </p>
          <div className="flex items-center gap-3">
            <span className="font-display font-extrabold text-xl tracking-[0.25em]">{profile.invite_code}</span>
            <Button size="sm" variant="outline" onClick={copy} className="rounded-full">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {profile?.status === "active" && <TrustBadge type="parent_approved" />}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Earned" value={money(earnings)} />
        <StatCard label="Upcoming" value={upcoming.length} />
        <StatCard label="Pending" value={pending.length} />
      </div>

      <section>
        <h2 className="font-heading font-bold mb-3">Upcoming jobs</h2>
        {upcoming.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No jobs on the calendar yet. Keep your listings fresh!
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-card border border-border rounded-2xl p-4 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-heading font-semibold">{b.listing_title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {b.scheduled_start ? format(new Date(b.scheduled_start), "EEE, MMM d · h:mm a") : "TBD"}
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section>
          <h2 className="font-heading font-bold mb-3">Waiting for parent approval</h2>
          <div className="space-y-2">
            {pending.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-semibold">{b.listing_title}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <div className="font-display text-xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}