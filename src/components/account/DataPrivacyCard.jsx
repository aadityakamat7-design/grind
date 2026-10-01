import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Download, Trash2, Eye, ShieldAlert, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { signOut } from "@/lib/signOut";
import { callAccountFunction, downloadJson } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";
import RecheckPanel from "@/components/account/RecheckPanel";

// The account-level actions: see your public profile, download everything you
// own, and close the account. Closing is blocked while work, money or earnings
// are still in flight, and says exactly what has to finish first.
export default function DataPrivacyCard({ data, role }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [error, setError] = useState("");
  const [blockers, setBlockers] = useState([]);

  const id = data.identity.user_id;
  const profileLink = role === "teen" ? `/teens/${id}` : `/neighbors/${id}`;
  const canPreview = role === "teen" || role === "buyer" || !!data.profile?.buyer;
  const provider = data.identity.auth_method !== "password" ? data.identity.auth_method : "password";

  const download = async () => {
    setDownloading(true);
    try {
      const res = await callAccountFunction("accountExport", {});
      downloadJson(res.filename, res.data);
      toast({ title: "Your data is downloading" });
    } catch (err) {
      toast({ title: "Couldn't build your file", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError("");
    setBlockers([]);
    try {
      await callAccountFunction("accountDelete", { confirm_text: confirmText, password: password || undefined });
      toast({ title: "Your account is closed" });
      signOut("/");
    } catch (err) {
      if (err.code === "blocked") setBlockers(err.blockers || []);
      if (err.code === "recheck_required") setNeedsRecheck(true);
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <SectionCard icon={ShieldAlert} title="Your account" description="Look at your public profile, take your data with you, or close your account.">
      {canPreview && (
        <Link to={profileLink} className="block">
          <Button variant="outline" className="w-full rounded-full justify-start">
            <Eye className="w-4 h-4 mr-2" /> See how others see you
          </Button>
        </Link>
      )}

      <Button variant="outline" className="w-full rounded-full justify-start" disabled={downloading} onClick={download}>
        {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        {downloading ? "Building your file…" : "Download my data"}
      </Button>
      <p className="text-[11px] text-muted-foreground -mt-2">
        A file with your details, bookings, messages and any reports you filed.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full rounded-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" /> Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Close your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your profile, addresses and notifications. Payment records, consent records, safety
              reports and the audit log are kept, as our Privacy Policy describes.
              {role === "parent" ? " Your linked teens are paused until another parent links." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="del_confirm">Type DELETE to confirm</Label>
              <Input id="del_confirm" className="rounded-xl mt-1" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
            </div>
            {(needsRecheck || data.recheck?.needed) && (
              <RecheckPanel provider={provider} password={password} onPasswordChange={setPassword} busy={deleting} note="Confirm it's you to close the account." />
            )}

            {!!blockers.length && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-2">
                <p className="text-xs font-semibold text-amber-700">What has to finish first</p>
                <ul className="space-y-1.5">
                  {blockers.map((b, i) => (
                    <li key={i} className="text-[11px] text-amber-700/90">
                      <span className="font-semibold">{b.label}:</span> {b.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && !blockers.length && <p className="text-xs text-destructive font-medium">{error}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep my account</AlertDialogCancel>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
              disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
              onClick={remove}
            >
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Closing…</> : "Close my account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  );
}