import React from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useGrindUser } from "@/hooks/useGrindUser";
import {
  Home, ListChecks, CalendarCheck, MessageSquare, DollarSign, User as UserIcon,
  ShieldCheck, Search, LayoutDashboard, CreditCard, Zap,
} from "lucide-react";

const NAV = {
  teen: [
    { to: "/", label: "Home", icon: Home },
    { to: "/listings", label: "Listings", icon: ListChecks },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/earnings", label: "Earnings", icon: DollarSign },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ],
  parent: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/payouts", label: "Payouts", icon: CreditCard },
    { to: "/profile", label: "Settings", icon: UserIcon },
  ],
  buyer: [
    { to: "/", label: "Browse", icon: Search },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ],
};

export default function AppLayout() {
  const { user, loading } = useGrindUser();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.onboarding_complete || !user?.app_role) {
    return <Navigate to="/onboarding" replace />;
  }

  const nav = NAV[user.app_role] || NAV.buyer;
  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight">Grind</span>
          </div>
          <span className="text-xs font-medium capitalize px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
            {user.app_role}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-28">
        <Outlet context={{ user }} />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-background/90 backdrop-blur border-t border-border">
        <div className="max-w-3xl mx-auto px-2 flex justify-around">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-2 flex-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}