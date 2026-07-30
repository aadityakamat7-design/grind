import React from "react";
import { Outlet, NavLink, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, List, CalendarDays, MessageCircle, Wallet, LayoutDashboard, ShieldCheck, Search, Zap, UserCircle, Briefcase, ArrowLeft, LifeBuoy } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import NotificationBell from "@/components/grind/NotificationBell";

const TABS = {
  teen: [
    { to: "/teen", label: "Home", icon: Home, end: true },
    { to: "/teen/listings", label: "Listings", icon: List },
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/teen/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/teen/wallet", label: "Wallet", icon: Wallet },
  ],
  parent: [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/parent/approvals", label: "Approvals", icon: ShieldCheck },
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

export default function Layout() {
  const { user, loading, reload } = useAppUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isChildPage = /^\/(bookings|messages|teens)\/.+/.test(location.pathname);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!user.app_role || !user.onboarded) return <Navigate to="/onboarding" replace />;

  const tabs = TABS[user.app_role] || TABS.buyer;
  const roleLabel = ROLE_LABELS[user.app_role] || "Member";

  const NavItems = () => (
    <nav className="flex flex-col gap-1">
      {tabs.map((tab) => {
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
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-foreground text-background shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-card z-40">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">KickStart</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {roleLabel}
          </p>
          <NavItems />
        </div>
        <div className="border-t border-border p-3">
          <Link to="/account" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 hover:bg-accent transition-colors">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
            </div>
          </Link>
          <Link to="/support" className="flex items-center gap-3 rounded-xl px-3.5 py-2 mt-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <LifeBuoy className="w-4 h-4 shrink-0" /> Support
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="px-4 h-14 flex items-center justify-between">
          {isChildPage ? (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center shadow-md">
                <Zap className="w-4.5 h-4.5 text-background" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">KickStart</span>
            </Link>
          )}
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <Link to="/support" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Help</Link>
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <UserCircle className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end px-8 bg-card/80 backdrop-blur-md border-b border-border">
          {isChildPage && (
            <button
              onClick={() => navigate(-1)}
              className="mr-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <Link to="/account" className="text-muted-foreground hover:text-foreground transition-colors">
              <UserCircle className="w-6 h-6" />
            </Link>
          </div>
        </header>

        <main className="max-w-3xl lg:max-w-5xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8 pb-28 lg:pb-12">
          <Outlet context={{ user, reload }} />
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto flex items-stretch justify-around">
          {tabs.map((tab) => {
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
                  `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-medium transition-colors duration-200 ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}