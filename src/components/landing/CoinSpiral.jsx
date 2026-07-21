import React, { useEffect, useRef } from "react";

// Scroll-driven pseudo-3D coin spiral rendered on a lightweight 2D canvas.
// Coins orbit a vertical spiral; scrolling advances rotation and descent.
export default function CoinSpiral({ className = "" }) {
  const canvasRef = useRef(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf, w, h, dpr;

    const N = 26;
    const coins = Array.from({ length: N }, (_, i) => ({
      phase: (i / N) * Math.PI * 2,
      depth: i / N,
      size: 14 + Math.random() * 14,
      speed: 0.15 + Math.random() * 0.2,
      gold: Math.random() > 0.35,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onScroll = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scrollRef.current = window.scrollY / max;
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const scroll = scrollRef.current;
      const time = reduced ? 0 : t / 1000;
      const cx = w / 2;

      const sorted = [...coins].sort(
        (a, b) => Math.sin(a.phase + time * a.speed + scroll * 6) - Math.sin(b.phase + time * b.speed + scroll * 6)
      );

      for (const c of sorted) {
        const angle = c.phase + time * c.speed + scroll * 6;
        const radius = (0.18 + c.depth * 0.28) * w;
        const x = cx + Math.cos(angle) * radius;
        const y = ((c.depth + scroll * 0.9 + time * 0.02) % 1) * (h + 80) - 40;
        const z = (Math.sin(angle) + 1) / 2; // 0 back, 1 front
        const size = c.size * (0.55 + z * 0.7);
        const squash = 0.45 + 0.3 * Math.abs(Math.sin(angle * 1.7 + c.phase));

        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = 0.25 + z * 0.65;
        ctx.rotate(Math.sin(angle) * 0.4);

        const grad = ctx.createLinearGradient(-size, -size, size, size);
        if (c.gold) {
          grad.addColorStop(0, "#fde68a");
          grad.addColorStop(0.5, "#f59e0b");
          grad.addColorStop(1, "#b45309");
        } else {
          grad.addColorStop(0, "#7dd3fc");
          grad.addColorStop(0.5, "#3b82f6");
          grad.addColorStop(1, "#1d4ed8");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * squash, 0, 0, Math.PI * 2);
        ctx.fill();

        // rim + $ mark on front-facing coins
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (z > 0.55 && squash > 0.6) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `bold ${size * 0.9}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("$", 0, 1);
        }
        ctx.restore();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (reduced) draw(0);
    else raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} aria-hidden="true" />;
}