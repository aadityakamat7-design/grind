import React, { useCallback, useEffect, useState } from "react";
import { loadAccountInfo } from "@/lib/accountApi";
import ErrorRetry from "@/components/grind/ErrorRetry";
import IdentityCard from "@/components/account/IdentityCard";
import EmailCard from "@/components/account/EmailCard";
import PasswordCard from "@/components/account/PasswordCard";
import NotificationsCard from "@/components/account/NotificationsCard";
import AddressBookCard from "@/components/account/AddressBookCard";
import HomeZipCard from "@/components/account/HomeZipCard";
import PublicProfileCard from "@/components/account/PublicProfileCard";
import MyTeensCard from "@/components/account/MyTeensCard";
import PayoutsLinkCard from "@/components/account/PayoutsLinkCard";
import LockedFieldsCard from "@/components/account/LockedFieldsCard";
import DataPrivacyCard from "@/components/account/DataPrivacyCard";

// Settings → Account information. One screen where any role can see and change
// everything about their own account; every section saves through the server.
export default function AccountInformation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const info = await loadAccountInfo();
      setData(info);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="h-5 w-40 rounded-lg skeleton-shimmer" />
            <div className="h-11 rounded-xl skeleton-shimmer" />
            <div className="h-11 rounded-xl skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) return <ErrorRetry onRetry={load} message={error || "We couldn't load your account details."} />;

  const role = data.identity?.role || "buyer";
  const hasBuyerProfile = !!data.profile?.buyer;

  return (
    <div className="space-y-3">
      <IdentityCard data={data} role={role} onSaved={load} />
      <EmailCard data={data} onSaved={load} />
      <PasswordCard data={data} />

      {role === "teen" && (
        <>
          <HomeZipCard data={data} onSaved={load} />
          <PublicProfileCard data={data} onSaved={load} />
        </>
      )}

      {hasBuyerProfile && <AddressBookCard data={data} onSaved={load} />}

      {role === "parent" && <MyTeensCard data={data} onSaved={load} />}

      {(role === "parent" || role === "teen") && <PayoutsLinkCard data={data} role={role} />}

      <NotificationsCard data={data} onSaved={load} />
      <LockedFieldsCard locked={data.locked} />
      <DataPrivacyCard data={data} role={role} />
    </div>
  );
}