import React from "react";
import { Outlet, NavLink, Navigate, Link } from "react-router-dom";
import { Home, List, CalendarDays, MessageCircle, Wallet, LayoutDashboard, ShieldCheck, Search, Zap, UserCircle, Flag, Briefcase } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import NotificationBell from "@/components/grind/NotificationBell";

const TABS = {
  TEEN: [
    { to: "/teen", label: "Home", icon: Home, end: true },
    { to: "/teen/listings", label: "Listings", icon: List },
    { to: "/jobs", label: "Jobs", icon: Briefcase },
    { to: "/teen/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/teen/wallet", label: "Wallet", icon: Wallet },
  ],
  PARENT: [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/parent/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/parent/payouts", label: "Payouts", icon: Wallet },
  ],
  BUYER: [
    { to: "/buyer", label: "Home", icon: Home, end: true },
    { to: "/browse", label: "Browse", icon: Search },
    { to: "/jobs", label: "My Jobs", icon: Briefcase },
    { to: "/buyer/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ],
  ADMIN: [
    { to: "/admin", label: "Admin", icon: LayoutDashboard, end: true },
    { to: "/browse", label: "Browse", icon: Search },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ],
};

export default function Layout() {
  const { user, loading, reload } = useAppUser();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!user.app_role || !user.onboarded) return <Navigate to="/onboarding" replace />;

  const tabs = TABS[user.app_role] || TABS.BUYER;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">Grind</span>
          </Link>
          <div className="flex items-center gap-4">
            <NotificationBell userId={user.id} />
            <Link to="/account" className="text-slate-300 hover:text-white transition-colors">
              <UserCircle className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-5 pb-28">
        <Outlet context={{ user, reload }} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-100">
        <div className="max-w-3xl mx-auto flex items-stretch justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-semibold transition-colors ${
                    isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
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