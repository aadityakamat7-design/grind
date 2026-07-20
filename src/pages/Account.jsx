import React from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, ShieldCheck } from "lucide-react";

const ROLE_LABELS = { TEEN: "Teen", PARENT: "Parent / Guardian", BUYER: "Neighbor" };

export default function Account() {
  const { user } = useOutletContext();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">Account</h1>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
          <UserCircle className="w-8 h-8 text-violet-500" />
        </div>
        <div>
          <p className="font-bold text-slate-900">{user.full_name || user.email}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 text-xs font-semibold">
            <ShieldCheck className="w-3 h-3" />
            {ROLE_LABELS[user.app_role] || "Member"}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => base44.auth.logout("/")}
      >
        <LogOut className="w-4 h-4 mr-2" /> Log out
      </Button>
    </div>
  );
}