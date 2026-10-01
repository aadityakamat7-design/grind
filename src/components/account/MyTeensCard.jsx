import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, ChevronDown, ChevronUp, UserPlus, Pause, Play, Lock, Unlock, ImageOff, MessageSquareOff, Unlink } from "lucide-react";
import { Image } from "@/components/ui/image";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";
import TeenLimitsCard from "@/components/account/TeenLimitsCard";

const STATUS = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  suspended: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-100" },
  pending_parent: { label: "Needs linking", className: "bg-secondary text-muted-foreground border-border" },
};

// A parent's view of every linked teen: who they are, how old they are, and the
// controls that actually protect them. Limits are edited through the server too.
export default function MyTeensCard({ data, onSaved }) {
  const { toast } = useToast();
  const teens = data.teens || [];
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState("");

  const control = async (teen, action, message) => {
    setBusy(action + teen.teen_user_id);
    try {
      await callAccountFunction("parentTeenControl", { teen_user_id: teen.teen_user_id, action });
      toast({ title: message });
      onSaved?.();
    } catch (err) {
      toast({ title: "Couldn't do that", description: err.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  return (
    <SectionCard icon={Users} title="My teens" description="Everyone linked to your account, with the controls that keep their work safe.">
      {!teens.length && (
        <p className="text-[13px] text-muted-foreground">
          No teens linked yet. Add one with the invite code from their account.
        </p>
      )}

      <div className="space-y-3">
        {teens.map((teen) => {
          const status = STATUS[teen.status] || STATUS.active;
          const isOpen = open === teen.teen_user_id;
          return (
            <div key={teen.teen_user_id} className="rounded-xl border border-border p-3.5 space-y-3">
              <div className="flex items-start gap-3">
                {teen.photo_url ? (
                  <Image src={teen.photo_url} alt="" className="w-12 h-12 rounded-xl shrink-0" fittingType="fill" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {(teen.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{teen.name}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {teen.age ? `${teen.age} years old` : "Age not on file"}
                    {teen.withdrawals_locked ? " · Cash-outs paused" : ""}
                  </p>
                </div>
                <Badge variant="outline" className={`rounded-full text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
              </div>

              {teen.bio && <p className="text-[12px] text-muted-foreground line-clamp-2">{teen.bio}</p>}

              <div className="flex flex-wrap gap-2">
                {teen.status === "active" ? (
                  <Button variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => control(teen, "pause", `${teen.name}'s account is paused`)}>
                    <Pause className="w-3.5 h-3.5 mr-1.5" /> Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => control(teen, "resume", `${teen.name}'s account is active again`)}>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Resume
                  </Button>
                )}

                <Button
                  variant="outline" size="sm" className="rounded-full h-8" disabled={busy}
                  onClick={() => control(teen, teen.withdrawals_locked ? "unlock_withdrawals" : "lock_withdrawals", teen.withdrawals_locked ? "Cash-outs enabled" : "Cash-outs paused")}
                >
                  {teen.withdrawals_locked ? <Unlock className="w-3.5 h-3.5 mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
                  {teen.withdrawals_locked ? "Allow cash-outs" : "Lock cash-outs"}
                </Button>

                {teen.photo_url && (
                  <Button variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => control(teen, "remove_photo", "Photo removed")}>
                    <ImageOff className="w-3.5 h-3.5 mr-1.5" /> Remove photo
                  </Button>
                )}
                {teen.bio && (
                  <Button variant="outline" size="sm" className="rounded-full h-8" disabled={busy} onClick={() => control(teen, "remove_bio", "About me removed")}>
                    <MessageSquareOff className="w-3.5 h-3.5 mr-1.5" /> Remove About me
                  </Button>
                )}

                <Button variant="outline" size="sm" className="rounded-full h-8" onClick={() => setOpen(isOpen ? "" : teen.teen_user_id)}>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 mr-1.5" /> : <ChevronDown className="w-3.5 h-3.5 mr-1.5" />}
                  Limits
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-full h-8 text-destructive border-destructive/20 hover:bg-destructive/10" disabled={busy}>
                      <Unlink className="w-3.5 h-3.5 mr-1.5" /> Unlink
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unlink {teen.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Their account is paused until a parent links again with their invite code. Their jobs and earnings stay as they are.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => control(teen, "unlink", "Unlinked")}
                      >
                        Unlink
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {isOpen && <TeenLimitsCard teen={teen} onSaved={onSaved} />}
            </div>
          );
        })}
      </div>

      <Link to="/parent/link" className="block">
        <Button variant="outline" className="w-full rounded-full">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add another teen
        </Button>
      </Link>
    </SectionCard>
  );
}