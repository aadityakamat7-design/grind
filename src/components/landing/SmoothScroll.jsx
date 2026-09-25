import { useEffect } from "react";

// Smooth momentum scrolling for the landing page only.
// Lenis is synced with GSAP's ticker + ScrollTrigger so scroll-triggered
// animations stay in lock-step. Reduced-motion users get native scroll.
// Touch devices keep native momentum scrolling (syncTouch: false).
// Destroyed on unmount — no lingering instance or ticker callback.
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // native scroll for reduced-motion users

    let lenis;
    let gsapRef;
    let tickerFn;
    let anchorHandler;
    let dialogObserver;
    let cancelled = false;

    (async () => {
      const [{ default: Lenis }, { gsap }] = await Promise.all([
        import("lenis"),
        import("gsap"),
      ]);
      if (cancelled) return;

      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;

      gsapRef = gsap;
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1,
      });

      // Keep ScrollTrigger in sync with Lenis
      lenis.on("scroll", ScrollTrigger.update);

      // Drive Lenis from GSAP's ticker so both share one RAF loop
      tickerFn = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);

      // Anchor links: glide to sections, offset for the 64px sticky header
      anchorHandler = (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const href = link.getAttribute("href");
        if (!href || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -64 });
      };
      document.addEventListener("click", anchorHandler, true);

      // Pause background scroll when a modal/dialog opens, resume on close
      dialogObserver = new MutationObserver(() => {
        const open = document.querySelector(
          '[role="dialog"][data-state="open"]'
        );
        if (open) lenis.stop();
        else lenis.start();
      });
      dialogObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-state"],
      });
    })();

    return () => {
      cancelled = true;
      if (anchorHandler) document.removeEventListener("click", anchorHandler, true);
      if (dialogObserver) dialogObserver.disconnect();
      if (lenis) lenis.destroy();
      if (gsapRef && tickerFn) gsapRef.ticker.remove(tickerFn);
    };
  }, []);

  return null;
}