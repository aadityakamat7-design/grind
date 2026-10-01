import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { prepareImage } from "@/lib/imageProcessing";

const OUTPUT = 512; // the square we produce, plenty for a profile photo

// Crops a photo to a square before it is uploaded: drag the picture to choose
// what sits in the middle. The result goes through the app's usual image
// pipeline, which converts iPhone photos to JPEG and strips location data.
export default function SquareCropDialog({ file, onCancel, onCrop }) {
  const canvasRef = useRef(null);
  const [bitmap, setBitmap] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [box, setBox] = useState(280);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prepared = file.type?.startsWith("image/") ? file : await prepareImage(file);
        let bmp;
        if (typeof window.createImageBitmap === "function") bmp = await window.createImageBitmap(prepared);
        else {
          const url = URL.createObjectURL(prepared);
          bmp = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
          });
        }
        if (!cancelled) setBitmap(bmp);
      } catch (err) {
        if (!cancelled) setError(err.message || "We couldn't read that photo.");
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // The square shown on screen: at most 280px, but never wider than the phone.
  useEffect(() => {
    const width = Math.min(280, (typeof window !== "undefined" ? window.innerWidth : 375) - 80);
    setBox(Math.max(200, width));
  }, []);

  const minOffset = () => {
    if (!bitmap) return { x: 0, y: 0 };
    const scale = Math.max(box / bitmap.width, box / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    return { x: Math.min(0, box - w) / 2, y: Math.min(0, box - h) / 2, scale, w, h };
  };

  useEffect(() => {
    if (!bitmap) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { scale, w, h } = minOffset();
    const ratio = box / w;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, box, box);
    const clamped = clampOffset();
    ctx.drawImage(bitmap, clamped.x, clamped.y, w, h);
    void ratio;
    void scale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitmap, offset, box]);

  function clampOffset() {
    if (!bitmap) return offset;
    const { x: minX, y: minY, w, h } = minOffset();
    const maxX = 0;
    const maxY = 0;
    return {
      x: Math.min(maxX, Math.max(minX, offset.x)),
      y: Math.min(maxY, Math.max(minY, offset.y)),
      w,
      h,
    };
  }

  const onPointerDown = (e) => {
    drag.current = { startX: e.clientX, startY: e.clientY, base: offset };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const next = {
      x: drag.current.base.x + (e.clientX - drag.current.startX),
      y: drag.current.base.y + (e.clientY - drag.current.startY),
    };
    setOffset(next);
  };
  const onPointerUp = () => { drag.current = null; };

  const apply = async () => {
    if (!bitmap) return;
    setWorking(true);
    try {
      const clamped = clampOffset();
      const scale = clamped.w / bitmap.width;
      const sourceX = Math.max(0, -clamped.x / scale);
      const sourceY = Math.max(0, -clamped.y / scale);
      const sourceSize = Math.min(bitmap.width - sourceX, bitmap.height - sourceY);

      const out = document.createElement("canvas");
      out.width = OUTPUT;
      out.height = OUTPUT;
      const ctx = out.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUTPUT, OUTPUT);
      ctx.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT, OUTPUT);

      const blob = await new Promise((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("We couldn't process that photo.");
      const cropped = new File([blob], "profile.jpg", { type: "image/jpeg" });
      await onCrop(cropped);
    } catch (err) {
      setError(err.message || "We couldn't process that photo. Please try another.");
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl border border-border shadow-floating p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Crop your photo</h3>
          <button onClick={onCancel} aria-label="Cancel" className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Drag the picture to choose what sits in the square.</p>

        <div className="flex justify-center">
          <div
            className="relative rounded-2xl overflow-hidden bg-secondary touch-none"
            style={{ width: box, height: box }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} width={box} height={box} className="w-full h-full cursor-grab active:cursor-grabbing" />
          </div>
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}

        <div className="flex gap-2.5">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button className="flex-1 rounded-full" onClick={apply} disabled={!bitmap || working}>
            <Check className="w-4 h-4 mr-1.5" /> {working ? "Saving…" : "Use this crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}