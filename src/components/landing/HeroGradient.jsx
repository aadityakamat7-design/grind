import { useEffect, useState, lazy, Suspense } from "react";

// Lazy-load the WebGL shader gradient so it never delays LCP.
// The headline and hero content render first; the gradient fades in
// over ~600ms once the chunk loads and the canvas is ready.
const ShaderGradientCanvas = lazy(() =>
  import("@shadergradient/react").then((m) => ({ default: m.ShaderGradientCanvas }))
);
const ShaderGradient = lazy(() =>
  import("@shadergradient/react").then((m) => ({ default: m.ShaderGradient }))
);

// Static CSS gradient fallback in brand colors — shown immediately so the
// hero never flashes white, and used exclusively when WebGL is skipped.
const STATIC_GRADIENT = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  background:
    "radial-gradient(ellipse 80% 60% at 25% 15%, #2563EB 0%, transparent 55%), " +
    "radial-gradient(ellipse 60% 40% at 75% 85%, #E8A33D 0%, transparent 35%), " +
    "linear-gradient(135deg, #0B1E33 0%, #14254a 100%)",
};

// Inner component that handles the fade-in once the lazy chunk resolves
function GradientContent() {
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpacity(1));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity,
        transition: "opacity 600ms ease-in",
      }}
    >
      <ShaderGradientCanvas
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        pixelDensity={1}
      >
        <ShaderGradient
          type="waterPlane"
          animate="on"
          uSpeed={0.15}
          uStrength={1.5}
          uDensity={1.2}
          color1="#0B1E33"
          color2="#2563EB"
          color3="#E8A33D"
          brightness={1.1}
          grain="on"
          cDistance={4}
        />
      </ShaderGradientCanvas>
    </div>
  );
}

export default function HeroGradient({ heroRef }) {
  const [useWebGL, setUseWebGL] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  // Decide whether to use WebGL: skip for reduced motion, no WebGL,
  // small screens (<768px), or low-power devices (≤4 cores)
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmallScreen = window.innerWidth < 768;
    const isLowPower = (navigator.hardwareConcurrency || 8) <= 4;

    let hasWebGL = false;
    try {
      const canvas = document.createElement("canvas");
      hasWebGL = !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch (e) {
      hasWebGL = false;
    }

    if (!reduced && hasWebGL && !isSmallScreen && !isLowPower) {
      setUseWebGL(true);
    }
  }, []);

  // Pause when the hero scrolls out of view
  useEffect(() => {
    if (!heroRef?.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [heroRef]);

  // Pause when the browser tab is hidden
  useEffect(() => {
    const handler = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const staticFallback = <div aria-hidden="true" style={STATIC_GRADIENT} />;

  if (!useWebGL) return staticFallback;

  const showAnimated = heroInView && tabVisible;

  return (
    <>
      {staticFallback}
      {showAnimated && (
        <Suspense fallback={null}>
          <GradientContent />
        </Suspense>
      )}
    </>
  );
}