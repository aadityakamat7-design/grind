import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import TrustBadge from "@/components/grind/TrustBadge";
import { Button } from "@/components/ui/button";
import { LogOut, Star } from "lucide-react";

export default function Profile() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let p = null;
      if (user.app_role === "teen") {
        p = (await base44.entities.TeenProfile.filter({ created_by_id: user.id }))[0];
      } else if (user.app_role === "parent") {
        p = (await base44.entities.ParentProfile.filter({ created_by_id: user.id }))[0];
      } else {
        p = (await base44.entities.BuyerProfile.filter({ created_by_id: user.id }))[0];
      }
      setProfile(p || null);
      setLoading(false);
    })();
  }, [user.id, user.app_role]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const name = profile?.display_name || profile?.full_name || user.full_name;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-display font-extrabold text-2xl mx-auto mb-3">
          {name?.[0]}
        </div>
        <h1 className="font-display text-xl font-extrabold">{name}</h1>
        <p className="text-sm text-muted-foreground capitalize">{user.app_role} account · {user.email}</p>

        {user.app_role === "teen" && profile && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {profile.status === "active" ? <TrustBadge type="parent_approved" /> : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">Waiting on parent link</span>
            )}
            {profile.review_count > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {profile.avg_rating?.toFixed(1)} ({profile.review_count})
              </span>
            )}
          </div>
        )}
        {user.app_role === "buyer" && <div className="mt-3 flex justify-center"><TrustBadge type="id_verified" /></div>}
      </div>

      {user.app_role === "teen" && profile?.bio && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="font-heading font-bold text-sm mb-1">Bio</div>
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        </div>
      )}

      {user.app_role === "teen" && profile?.invite_code && profile?.status !== "active" && (
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="font-heading font-bold text-sm mb-1">Parent invite code</div>
          <div className="font-display text-2xl font-extrabold tracking-[0.25em]">{profile.invite_code}</div>
        </div>
      )}

      <Button variant="outline" className="w-full rounded-full h-12" onClick={() => base44.auth.logout()}>
        <LogOut className="w-4 h-4 mr-2" /> Log out
      </Button>
    </div>
  );
}