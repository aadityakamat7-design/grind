import React, { useState } from "react";
import { Outlet, NavLink, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, List, CalendarDays, MessageCircle, Wallet, LayoutDashboard, ShieldCheck, Search, Zap, Briefcase, ArrowLeft, LifeBuoy, MoreHorizontal } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import NotificationBell from "@/components/grind/NotificationBell";
import SiteFooter from "@/components/SiteFooter";

const TABS = {
  teen: [
    { to: "/teen", label: "Home", icon: Home, end: true },
    { to: "/teen/listings", label: "Services", icon: List },
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/teen/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/teen/wallet", label: "Wallet", icon: Wallet },
  ],
  parent: [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/parent/payouts", label: "Payouts", icon: Wallet },
  ],
  buyer: [
    { to: "/buyer", label: "Home", icon: Home, end: true },
    { to: "/browse", label: "Browse", icon: Search },
    { to: "/jobs", label: "My Jobs", icon: Briefcase },
    { to: "/buyer/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ],
  admin: [
    { to: "/admin", label: "Admin", icon: LayoutDashboard, end: true },
    { to: "/browse", label: "Browse", icon: Search },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ],
};

const ROLE_LABELS = {
  teen: "Teen Earner",
  parent: "Parent / Guardian",
  buyer: "Neighbor",
  admin: "Administrator",
};

const ROLE_HOME = { teen: "/teen", parent: "/parent", buyer: "/buyer", admin: "/admin" };

const RESTRICTED_PREFIXES = [
  { prefix: "/teen", role: "teen" },
  { prefix: "/parent", role: "parent" },
  { prefix: "/buyer", role: "buyer" },
  { prefix: "/admin", role: "admin" },
];

export default function Layout() {
  const { user, loading, reload } = useAppUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const isChildPage = /^\/(bookings|messages|teens|neighbors)\/.+/.test(location.pathname);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  if (!user) {
    // If there's a token in localStorage but the user couldn't be loaded,
    // this is likely a transient failure after returning from an external
    // redirect (Stripe Identity/Connect). Show a loading state with a retry
    // option instead of bouncing the user to the home page unsigned in.
    const token = typeof window !== 'undefined' && window.localStorage.getItem('base44_access_token');
    if (token) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your session…</p>
            <button onClick={() => reload()} className="text-sm text-primary font-medium hover:underline">
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }
  if (!user.app_role || !user.onboarded) return <Navigate to="/onboarding" replace />;

  // Block cross-role access — but allow parents with buyer mode to access
  // buyer routes so they can browse, book, and manage their own bookings.
  const blocked = RESTRICTED_PREFIXES.find(({ prefix }) =>
    location.pathname === prefix || location.pathname.startsWith(prefix + "/")
  );
  if (blocked && blocked.role !== user.app_role) {
    const parentBuyerAllowed = blocked.role === 'buyer' && user.app_role === 'parent' && user.has_buyer_profile;
    if (!parentBuyerAllowed) {
      return <Navigate to={ROLE_HOME[user.app_role] || "/"} replace />;
    }
  }

  let tabs = [...(TABS[user.app_role] || TABS.buyer)];
  if (user.app_role === 'parent' && user.has_buyer_profile) {
    tabs = [
      ...TABS.parent,
      { divider: true, label: 'Hire Services' },
      { to: '/browse', label: 'Browse', icon: Search },
      { to: '/jobs', label: 'Post a Job', icon: Briefcase },
      { to: '/buyer/bookings', label: 'My Bookings', icon: CalendarDays },
    ];
  }
  const mobileTabs = tabs.filter((t) => !t.divider);
  const primaryTabs = mobileTabs.length > 5 ? mobileTabs.slice(0, 4) : mobileTabs;
  const overflowTabs = mobileTabs.length > 5 ? mobileTabs.slice(4) : [];
  const roleLabel = ROLE_LABELS[user.app_role] || "Member";
  const initials = (user.full_name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] flex-col border-r border-border bg-card z-40">
        <div className="h-[68px] flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-[19px] tracking-tight text-foreground">Blockwork</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3.5 py-5">
          <p className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
            {roleLabel}
          </p>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab, idx) => {
              if (tab.divider) {
                return (
                  <p key={`div-${idx}`} className="px-3.5 mt-4 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {tab.label}
                  </p>
                );
              }
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  onClick={() => {
                    if (location.pathname === tab.to) window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-[14px] font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={2.2} />
                  <span>{tab.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-border p-3">
          <Link to="/account" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent transition-colors">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate text-foreground">{user.full_name || user.email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
          </Link>
          <Link to="/support" className="flex items-center gap-3 rounded-xl px-3 py-2 mt-1 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <LifeBuoy className="w-4 h-4 shrink-0" /> Support
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="px-4 h-14 flex items-center justify-between">
          {isChildPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-semibold text-[15px]"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-soft">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-[17px] tracking-tight text-foreground">Blockwork</span>
            </Link>
          )}
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px]">
                {initials}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-[68px] items-center justify-end px-8 bg-card/80 backdrop-blur-xl border-b border-border">
          {isChildPage && (
            <button
              onClick={() => navigate(-1)}
              className="mr-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-semibold text-[14px]"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[13px]">
                {initials}
              </div>
            </Link>
          </div>
        </header>

        <main className="max-w-3xl lg:max-w-5xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8 pb-28 lg:pb-12">
          <Outlet context={{ user, reload }} />
        </main>
        <SiteFooter />
      </div>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto flex items-stretch justify-around">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                onClick={() => {
                  if (location.pathname === tab.to) window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-2.5 px-2 text-[10px] font-semibold transition-colors duration-200 min-w-[44px] min-h-[44px] ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={2.2} />
                {tab.label}
              </NavLink>
            );
          })}
          {overflowTabs.length > 0 && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200 min-w-[44px] min-h-[44px]"
            >
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2.2} />
              More
            </button>
          )}
        </div>
      </nav>

      {/* Mobile overflow sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-card border-t border-border rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-[sheet-up_0.25s_ease-out] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-border" />
            </div>
            <div className="px-3 pb-3 pt-2 space-y-1">
              {overflowTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold transition-colors min-h-[48px] ${
                        isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" strokeWidth={2.2} />
                    {tab.label}
                  </NavLink>
                );
              })}
              <div className="border-t border-border my-2" />
              <Link to="/account" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-foreground hover:bg-accent transition-colors min-h-[48px]">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{initials}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground font-normal">{roleLabel}</p>
                </div>
              </Link>
              <Link to="/support" onClick={() => setMoreOpen(false)} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-foreground hover:bg-accent transition-colors min-h-[48px]">
                <LifeBuoy className="w-5 h-5 shrink-0" /> Support
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}