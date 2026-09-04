import { useEffect } from "react";

// If a user lands on the old Base44-published domain
// (teenskickstart.base44.app), redirect them to the equivalent path on the
// custom domain (blockwork.online) so they're never stranded on the old host.
// Preview hosts (which use `--` separators) are left untouched.
const OLD_HOST = "teenskickstart.base44.app";
const NEW_ORIGIN = "https://blockwork.online";

export default function CanonicalDomainRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== OLD_HOST) return;
    const target = NEW_ORIGIN + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
  }, []);

  return null;
}