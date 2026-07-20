import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { money } from "@/lib/grind";
import StatusBadge from "@/components/grind/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Plus } from "lucide-react";

export default function ParentDashboard({ user }) {
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linking, setLinking] = useState(false);

  const load = async () => {
    const lks = await base44.entities.ParentTeenLink.filter({ parent_user_id: user.id });
    setLinks(lks);
    if (lks.length > 0) {
      const teenIds = lks.map((l) => l.teen_user_id);
      const bks = await base44.entities.Booking.filter({ teen_user_id: { $in: teenIds } }, "-created_date", 50);
      setBookings(bks);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.id]);

  const linkTeen = async () => {
    setLinkError("");
    setLinking(true);
    const matches = await base44.entities.TeenProfile.filter({ invite_code: code.trim().toUpperCase() });
    const teen = matches[0];
    if (!teen) {
      setLinkError("No teen found with that code.");
      setLinking(false);
      return;
    }
    await base44.entities.ParentTeenLink.create({
      parent_user_id: user.id,
      teen_user_id: teen.created_by_id,
      teen_display_name: teen.display_name,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });
    await base44.entities.TeenProfile.update(teen.id, { status: "active" });
    await base44.entities.Notification.create({
      user_id: teen.created_by_id,
      title: "Your parent approved you! 🎉",
      body: "You can now publish listings and take bookings.",
      type: "app",
    });
    setCode("");
    setLinking(false);
    load();
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const awaitingApproval = bookings.filter((b) => b.status === "pending_parent_approval");
  const totalEarned = bookings
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + (b.price_total - (b.platform_fee || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Parent dashboard</h1>
        <p className="text-muted-foreground text-sm">Full visibility into your teens' activity.</p>
      </div>

      {awaitingApproval.length > 0 && (
        <Link to="/approvals" className="block bg-amber-50 border border-amber-200 rounded-2xl p-5 hover:border-amber-400 transition-colors">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-700" />
            <div>
              <div className="font-heading font-bold text-amber-900">
                {awaitingApproval.length} booking{awaitingApproval.length > 1 ? "s" : ""} need your approval
              </div>
              <div className="text-sm text-amber-800">Tap to review and approve or deny.</div>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="font-display text-xl font-extrabold">{links.length}</div>
          <div className="text-xs text-muted-foreground">Linked teens</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="font-display text-xl font-extrabold">{money(totalEarned)}</div>
          <div className="text-xs text-muted-foreground">Total teen earnings</div>
        </div>
      </div>

      <section>
        <h2 className="font-heading font-bold mb-3">My teens</h2>
        {links.length === 0 && (
          <p className="text-sm text-muted-foreground mb-3">No teens linked yet. Enter your teen's invite code:</p>
        )}
        <div className="space-y-2 mb-4">
          {links.map((l) => (
            <Link key={l.id} to={`/teen/${l.teen_user_id}`} className="block bg-card border border-border rounded-2xl p-4 hover:border-primary transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold">{l.teen_display_name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">Linked ✓</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Teen invite code" className="tracking-widest font-mono" />
          <Button onClick={linkTeen} disabled={linking || !code} className="rounded-full shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Link
          </Button>
        </div>
        {linkError && <p className="text-sm text-destructive mt-2">{linkError}</p>}
      </section>

      <section>
        <h2 className="font-heading font-bold mb-3">Recent activity</h2>
        {bookings.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 8).map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-heading font-semibold">{b.listing_title}</div>
                    <div className="text-xs text-muted-foreground">{b.teen_display_name} · {money(b.price_total)}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}