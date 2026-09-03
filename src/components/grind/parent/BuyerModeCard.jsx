import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingBag, Search, CheckCircle2, X } from "lucide-react";
import { setCachedUser } from "@/lib/useAppUser";
import LegalModal from "@/components/grind/LegalModal";

export default function BuyerModeCard({ user, reload }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [legalModal, setLegalModal] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
      setProfile(profiles[0] || null);
    } catch (err) {
      console.error("BuyerModeCard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const enableBuyerMode = async () => {
    setEnabling(true);
    try {
      const res = await base44.functions.invoke("enableBuyerMode", {});
      if (res.data?.error) {
        setEnabling(false);
        return;
      }
      const updated = await base44.auth.updateMe({ has_buyer_profile: true });
      setCachedUser(updated);
      if (reload) reload();
      setProfile(res.data.profile);
      if (res.data.needsAddress) {
        setSetupOpen(true);
      }
    } catch (err) {
      console.error("enableBuyerMode failed:", err);
    }
    setEnabling(false);
  };

  const saveAddress = async () => {
    setSaving(true);
    setGeoError("");
    try {
      const res = await base44.functions.invoke("geocodeAddress", { query: `${address}, ${zip}` });
      const geo = res.data;
      await base44.entities.BuyerProfile.update(profile.id, {
        address,
        zip,
        latitude: geo.lat,
        longitude: geo.lng,
        resolved_city: geo.city,
        state: geo.state,
      });
      setSetupOpen(false);
      loadProfile();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Couldn't verify that address. Please check it and try again.";
      setGeoError(errorMsg);
    }
    setSaving(false);
  };

  if (user.app_role !== "parent") return null;

  const isReady = profile?.address && profile?.zip && profile?.latitude != null;

  return (
    <>
      {!isReady && !setupOpen && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground text-[15px]">Also hire teens for jobs</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                Need help around the house? Browse and book trusted local teens — same account, no separate sign-up.
              </p>
              <Button className="mt-3 rounded-full" size="sm" disabled={enabling || loading} onClick={enableBuyerMode}>
                {enabling ? "Enabling..." : profile ? "Complete setup" : "Enable buyer mode"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <Link to="/browse" className="flex items-center gap-3 bg-primary/5 rounded-2xl border border-primary/20 p-4 hover:bg-primary/10 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground text-[14px]">You're ready to hire teens</p>
            <p className="text-[12px] text-muted-foreground">Browse, book, and pay for jobs — all from this account.</p>
          </div>
          <Search className="w-5 h-5 text-primary" />
        </Link>
      )}

      {setupOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setSetupOpen(false)} />
          <div className="relative bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-floating w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-foreground">Set up your buyer profile</h3>
              {!saving && (
                <button onClick={() => setSetupOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">We need your address to show you nearby teens. Currently available in California only.</p>
            <div className="space-y-4">
              <div>
                <Label>Home address</Label>
                <Input className="rounded-xl mt-1" placeholder="123 Maple St" value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} />
              </div>
              <div>
                <Label>ZIP code</Label>
                <Input className="rounded-xl mt-1" placeholder="e.g. 94536" value={zip} onChange={(e) => setZip(e.target.value)} disabled={saving} />
              </div>
              {geoError && <p className="text-xs text-destructive font-medium">{geoError}</p>}
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer">
                <Checkbox checked={tosAccepted} onCheckedChange={setTosAccepted} className="mt-0.5" disabled={saving} />
                <span>I accept the{" "}
                  <button type="button" onClick={() => setLegalModal("terms")} className="text-foreground font-medium hover:underline">Terms of Service</button>
                  {" "}and{" "}
                  <button type="button" onClick={() => setLegalModal("privacy")} className="text-foreground font-medium hover:underline">Privacy Policy</button>.
                </span>
              </label>
              <Button className="w-full rounded-xl" disabled={!address || !zip || !tosAccepted || saving} onClick={saveAddress}>
                {saving ? "Verifying address..." : "Save & start browsing"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <LegalModal type={legalModal} open={!!legalModal} onOpenChange={(v) => !v && setLegalModal(null)} />
    </>
  );
}