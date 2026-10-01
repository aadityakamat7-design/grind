import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const KEY = "bw_redirects";
const WINDOW_MS = 5000;
const MAX_HITS = 7;

// Watches for routes fighting each other. It counts only automatic moves —
// a page load and a replace-style redirect — never a person tapping around the
// app. If one tab makes more than MAX_HITS of them in a few seconds, it stops the
// loop: logs it and sends the person to /start?loop=1, which explains and lets
// them continue or sign out. The counter lives in sessionStorage so it also sees
// loops made of full page reloads.
export default function RedirectLoopGuard() {
  const location = useLocation();
  const navType = useNavigationType();
  const firstRun = useRef(true);

  useEffect(() => {
    const isLoad = firstRun.current;
    firstRun.current = false;

    if (location.pathname === "/start" && location.search.includes("loop=1")) {
      try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
      return;
    }
    if (!isLoad && navType !== "REPLACE") return;

    try {
      const now = Date.now();
      const hits = JSON.parse(sessionStorage.getItem(KEY) || "[]").filter((h) => now - h.at < WINDOW_MS);
      hits.push({ at: now, path: location.pathname });
      sessionStorage.setItem(KEY, JSON.stringify(hits));
      if (hits.length >= MAX_HITS) {
        const trail = hits.map((h) => h.path).join(" > ");
        console.error("Redirect loop detected:", trail);
        base44.analytics.track({ eventName: "redirect_loop_detected", properties: { path: location.pathname, trail: trail.slice(0, 300) } });
        sessionStorage.removeItem(KEY);
        window.location.replace("/start?loop=1");
      }
    } catch {
      /* storage unavailable — the guard simply does nothing */
    }
  }, [location.pathname, location.search]);

  return null;
}