import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, RefreshCw, ExternalLink, Wallet, CalendarDays, Briefcase, LifeBuoy, ArrowUpRight } from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import DeleteAccountButton from "@/components/grind/DeleteAccountButton";
import AccountReviewsTab from "@/components/grind/AccountReviewsTab";
import ProfileSettingsCard from "@/components/grind/ProfileSettingsCard";
import RecoveryPhoneCard from "@/components/grind/RecoveryPhoneCard";
import ThemeToggle from "@/components/grind/ThemeToggle";
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

  // Role-specific tabs
  const tabs = [
    { key: "profile", label: "Profile" },
    ...(user.app_role !== "admin" ? [{ key: "reviews", label: "Reviews" }] : []),
    ...((user.app_role === "teen" || user.app_role === "parent") ? [{ key: "payouts", label: "Payouts" }] : []),
    ...((user.app_role === "teen" || user.app_role === "buyer" || (user.app_role === "parent" && user.has_buyer_profile)) ? [{ key: "bookings", label: "Bookings" }] : []),
    { key: "settings", label: "Settings" },
  ];

  const payoutsLink = user.app_role === "teen" ? "/teen/wallet" : "/parent/payouts";
  const bookingsLink = user.app_role === "teen" ? "/teen/bookings" : "/buyer/bookings";

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-5">
        <PageHeader title="Settings" subtitle="Your profile, payouts, bookings, and account." />

        {/* Scrollable tab bar */}
        <div className="flex gap-1 bg-secondary rounded-full p-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 rounded-full py-2 text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
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
        )}

        {tab === "reviews" && <AccountReviewsTab user={user} />}

        {tab === "payouts" && (
          <Link to={payoutsLink} className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground text-[14px]">
                {user.app_role === "teen" ? "Wallet & earnings" : "Payouts"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {user.app_role === "teen" ? "Balance, transactions, and cash out" : "Stripe Connect payouts and history"}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        )}

        {tab === "bookings" && (
          <div className="space-y-2">
            <Link to={bookingsLink} className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-[14px]">My bookings</p>
                <p className="text-[12px] text-muted-foreground">All upcoming and past jobs</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
            {user.app_role === "parent" && user.has_buyer_profile && (
              <Link to="/jobs" className="flex items-center gap-3 bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-[14px]">Post a job</p>
                  <p className="text-[12px] text-muted-foreground">Find help for a one-time task</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-2.5">
            <ThemeToggle />

            <Link to="/support" className="flex items-center gap-2.5 bg-card rounded-xl border border-border shadow-soft p-3 hover:shadow-card transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <LifeBuoy className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-[13px]">Support</p>
                <p className="text-[11px] text-muted-foreground">Get help and view FAQs</p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </Link>

            <RecoveryPhoneCard user={user} />

            {(user.app_role === "teen" || user.app_role === "buyer") && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full h-10"
                onClick={() => {
                  replayTour();
                  navigate(ROLE_HOME[user.app_role] || "/");
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Replay tour
              </Button>
            )}

            <div className="pt-2 space-y-2.5">
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => base44.auth.logout("/")}
              >
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </Button>

              <DeleteAccountButton user={user} />
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}