import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { setCachedUser } from "@/lib/useAppUser";

// Finishes the sign-up steps on the server (parent_link_shown → done) and then
// sends the account to its dashboard. The step is what the app checks, so this is
// the only way past onboarding — a screen can't skip it from the browser.
export default function LinkLaterButton({ label = "Go to my dashboard", onDone }) {
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    let dest = "";
    try {
      await base44.functions.invoke("advanceOnboarding", { to: "parent_link_shown" });
      const res = await base44.functions.invoke("advanceOnboarding", { to: "done" });
      dest = res.data?.dest || "";
      setCachedUser(null);
    } catch {
      /* the page reload below re-checks the step on the server */
    }
    // Hard redirect so the freshly-set step is picked up. A page they were
    // heading to before sign-up (saved on the server) wins over the dashboard.
    window.location.href = dest || (onDone ? onDone() : "/");
  };

  return (
    <Button className="w-full h-12 font-medium" disabled={saving} onClick={finish}>
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Finishing...
        </>
      ) : (
        label
      )}
    </Button>
  );
}