import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// One overlay at a time. The server decides whether the user needs the
// "Updated Terms" pop-up; everything that can appear on top of the app (the
// pop-up, the teen notice, the welcome tour) reads that answer from here, so
// two overlays can never open together.
//
// status: "loading" — we don't know yet (nothing else may open)
//         "needs"   — the Updated Terms pop-up is open and must be resolved
//         "clear"   — nothing in the way
const TermsGateContext = createContext({
  status: "clear",
  teenNotice: false,
  dismissNotice: () => {},
  accept: async () => {},
  refresh: async () => {},
});

export function TermsGateProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [teenNotice, setTeenNotice] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("checkTermsAcceptance", {});
      const d = res.data || {};
      setStatus(d.needsTermsReacceptance ? "needs" : "clear");
      setTeenNotice(d.teenNotice === true);
    } catch {
      // If the check fails, don't block anyone — the server gates each action.
      setStatus("clear");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const accept = useCallback(async () => {
    await base44.functions.invoke("acceptTerms", {
      accepted: true,
      userAgent: navigator.userAgent,
    });
    setStatus("clear");
    setTeenNotice(false);
  }, []);

  const dismissNotice = useCallback(() => setNoticeDismissed(true), []);

  return (
    <TermsGateContext.Provider
      value={{
        status,
        teenNotice: teenNotice && !noticeDismissed,
        dismissNotice,
        accept,
        refresh,
      }}
    >
      {children}
    </TermsGateContext.Provider>
  );
}

export function useTermsGate() {
  return useContext(TermsGateContext);
}