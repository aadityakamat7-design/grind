import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/grind/PageHeader";
import DeleteAccountButton from "@/components/grind/DeleteAccountButton";
import AccountReviewsTab from "@/components/grind/AccountReviewsTab";

const ROLE_LABELS = { teen: "Teen", parent: "Parent / Guardian", buyer: "Neighbor", admin: "Admin" };

export default function Account() {
  const { user } = useOutletContext();
  const [tab, setTab] = useState("profile");
  const initials = (user.full_name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "reviews", label: "Reviews" },
  ];

  return (
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
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-[15px] truncate">{user.full_name || user.email}</p>
              <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
              <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-secondary text-muted-foreground px-2.5 py-1 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                {ROLE_LABELS[user.app_role] || "Member"}
              </span>
            </div>
          </div>

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
  );
}