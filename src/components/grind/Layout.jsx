import React from "react";
import { Outlet, NavLink, Navigate, Link } from "react-router-dom";
import { Home, List, CalendarDays, MessageCircle, Wallet, LayoutDashboard, ShieldCheck, Search, Zap, UserCircle } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";

const TABS = {
  TEEN: [
    { to: "/teen", label: "Home", icon: Home, end: true },
    { to: "/teen/listings", label: "Listings", icon: List },
    { to: "/teen/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/teen/earnings", label: "Earnings", icon: Wallet },
  ],
  PARENT: [
    { to: "/parent", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/parent/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/parent/payouts", label: "Payouts", icon: Wallet },
  ],
  BUYER: [
    { to: "/browse", label: "Browse", icon: Search },
    { to: "/buyer/bookings", label: "Bookings", icon: CalendarDays },
    { to: "/messages", label: "Messages", icon: MessageCircle },
  ],
};

export default function Layout() {
  const { user, loading, reload } = useAppUser();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!user.app_role || !user.onboarded) return <Navigate to="/onboarding" replace />;

  const tabs = TABS[user.app_role] || TABS.BUYER;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">Grind</span>
          </Link>
          <Link to="/account" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <UserCircle className="w-6 h-6" />
          </Link>
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
                    isActive ? "text-violet-600" : "text-slate-400 hover:text-slate-600"
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