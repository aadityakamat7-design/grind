import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, RefreshCw, ExternalLink, Settings, CalendarDays, Briefcase, LifeBuoy } from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import DeleteAccountButton from "@/components/grind/DeleteAccountButton";
import AccountReviewsTab from "@/components/grind/AccountReviewsTab";
import ProfileSettingsCard from "@/components/grind/ProfileSettingsCard";
import RecoveryPhoneCard from "@/components/grind/RecoveryPhoneCard";
import { replayTour } from "@/hooks/useTour";
import { Image } from "@/components/ui/image";
import PullToRefresh from "@/components/PullToRefresh";

const ROLE_LABELS = { teen: "Teen", parent: "Parent / Guardian", buyer: "Neighbor", admin: "Admin" };
const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

export default function Account() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const initials = (user.full_name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [teenPhoto, setTeenPhoto] = useState(null);

  const load = useCallback(async () => {
    if (user.app_role !== "teen") return;
    try {
      const profiles = await base44.entities.TeenProfile.filter({ user_id: user.id });
      setTeenPhoto(profiles[0]?.photo_url || null);
    } catch {}
  }, [user.id, user.app_role]);

  useEffect(() => { load(); }, [load]);

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "settings", label: "Settings" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-5">
      <PageHeader title="Account" subtitle="Your profile, settings, and reviews." />

      <div className="flex gap-1 bg-secondary rounded-full p-1 w-full max-w-xs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex items-center gap-4">
            {teenPhoto ? (
              <Image src={teenPhoto} alt="" className="w-16 h-16 rounded-2xl shrink-0" fittingType="fill" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-foreground text-[15px] truncate">{user.full_name || user.email}</p>
              <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
              <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-secondary text-muted-foreground px-2.5 py-1 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                {ROLE_LABELS[user.app_role] || "Member"}
              </span>
            </div>
          </div>

          {(user.app_role === "teen" || user.app_role === "buyer") && (
            <Link
              to={user.app_role === "teen" ? `/teens/${user.id}` : `/neighbors/${user.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview my public profile
            </Link>
          )}

          <ProfileSettingsCard user={user} />
        </>
      ) : tab === "settings" ? (
        <>
          <div className="space-y-2">
            {user.app_role === "teen" && (
              <Link to="/teen/bookings" className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-[14px]">My bookings</p>
                  <p className="text-[12px] text-muted-foreground">All upcoming and past jobs</p>
                </div>
              </Link>
            )}
            {user.app_role === "parent" && user.has_buyer_profile && (
              <>
                <Link to="/jobs" className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px]">Post a job</p>
                    <p className="text-[12px] text-muted-foreground">Find help for a one-time task</p>
                  </div>
                </Link>
                <Link to="/buyer/bookings" className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-[14px]">My bookings</p>
                    <p className="text-[12px] text-muted-foreground">Jobs you've posted as a neighbor</p>
                  </div>
                </Link>
              </>
            )}
            <Link to="/support" className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-[14px]">Support</p>
                <p className="text-[12px] text-muted-foreground">Get help and view FAQs</p>
              </div>
            </Link>
          </div>

          <RecoveryPhoneCard user={user} />

          {(user.app_role === "teen" || user.app_role === "buyer") && (
            <Button
              variant="outline"
              className="w-full rounded-full h-12"
              onClick={() => {
                replayTour();
                navigate(ROLE_HOME[user.app_role] || "/");
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Replay tour
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full rounded-full h-12 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => base44.auth.logout("/")}
          >
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>

          <DeleteAccountButton user={user} />
        </>
      ) : (
        <AccountReviewsTab user={user} />
      )}
    </div>
    </PullToRefresh>
  );
}