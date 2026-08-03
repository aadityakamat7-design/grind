import React from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, ShieldCheck } from "lucide-react";
import DeleteAccountButton from "@/components/grind/DeleteAccountButton";

const ROLE_LABELS = { teen: "Teen", parent: "Parent / Guardian", buyer: "Neighbor", admin: "Admin" };

export default function Account() {
  const { user } = useOutletContext();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Account</h1>
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <UserCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{user.full_name || user.email}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-secondary text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
            <ShieldCheck className="w-3 h-3" />
            {ROLE_LABELS[user.app_role] || "Member"}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => base44.auth.logout("/")}
      >
        <LogOut className="w-4 h-4 mr-2" /> Log out
      </Button>

      <DeleteAccountButton user={user} />
    </div>
  );
}