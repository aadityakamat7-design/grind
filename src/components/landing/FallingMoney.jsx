import React, { useEffect, useRef } from "react";

// Full-page falling money layer — sparse dollar bills with pseudo-3D flip,
// scroll parallax by depth, and slight blur on bills closest to the camera.
export default function FallingMoney() {
  const canvasRef = useRef(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf, w, h, dpr;

    const N = 18;
    const bills = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      depth: Math.random(), // 0 far, 1 close
      speed: 10 + Math.random() * 14,
      sway: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.9,
      green: Math.random() > 0.35,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onScroll = () => { scrollRef.current = window.scrollY; };

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const time = reduced ? 0 : t / 1000;

      for (const b of bills) {
        const parallax = scrollRef.current * (0.04 + b.depth * 0.14);
        const size = 20 + b.depth * 28;
        const yy = (((b.y * h + time * b.speed * (0.4 + b.depth) + parallax) % (h + 160)) + h + 160) % (h + 160) - 80;
        const xx = b.x * w + Math.sin(time * 0.5 + b.sway) * 26 * (0.3 + b.depth);
        const flip = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.8 + b.sway * 2));

        ctx.save();
        ctx.translate(xx, yy);
        ctx.rotate(b.spin + time * b.spinSpeed + Math.sin(time * 0.5 + b.sway) * 0.15);
        ctx.scale(1, flip);
        ctx.globalAlpha = 0.1 + b.depth * 0.3;
        ctx.filter = b.depth > 0.82 ? "blur(3px)" : "none";

        const bw = size, bh = size * 0.48, r = 3;
        const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
        if (b.green) {
          grad.addColorStop(0, "#6ee7b7");
          grad.addColorStop(1, "#059669");
        } else {
          grad.addColorStop(0, "#7dd3fc");
          grad.addColorStop(1, "#2563eb");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, r);
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-bw / 2 + 2.5, -bh / 2 + 2.5, bw - 5, bh - 5);

        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = `bold ${bh * 0.62}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 0.5);
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

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}