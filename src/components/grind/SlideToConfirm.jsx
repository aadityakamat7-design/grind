import React, { useState, useRef, useCallback, useEffect } from "react";
import { Check, Loader2, ChevronRight } from "lucide-react";

// Slide-to-confirm gesture: a pill track with a draggable handle.
// Fires onConfirm only when dragged past 90% of the track width.
// Snaps back with an overshoot-eased animation if released early.
// Works with both mouse (desktop) and touch (mobile) via Pointer Events.
export default function SlideToConfirm({ onConfirm, label, disabled, loading, loadingLabel }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const trackRef = useRef(null);
  const startX = useRef(0);
  const baseX = useRef(0);
  const HANDLE_SIZE = 48;
  const PADDING = 4;
  const THRESHOLD = 0.9;

  const getMaxDrag = useCallback(() => {
    if (!trackRef.current) return 0;
    return Math.max(0, trackRef.current.offsetWidth - HANDLE_SIZE - PADDING * 2);
  }, []);

  const handlePointerDown = (e) => {
    if (disabled || loading || completed) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    baseX.current = dragX;
    setDragging(true);
    setAnimating(false);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    const max = getMaxDrag();
    const newX = Math.max(0, Math.min(baseX.current + delta, max));
    setDragX(newX);
  };

  const handlePointerUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    setAnimating(true);
    const max = getMaxDrag();
    if (dragX >= max * THRESHOLD) {
      setDragX(max);
      setCompleted(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
      setTimeout(() => onConfirm?.(), 380);
    } else {
      setDragX(0);
    }
  };

  // Reset after a failed action (loading went true→false while still mounted)
  useEffect(() => {
    if (!loading && completed) {
      const t = setTimeout(() => {
        setCompleted(false);
        setDragX(0);
        setAnimating(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [loading, completed]);

  const max = getMaxDrag();
  const progress = max > 0 ? dragX / max : 0;
  const textOpacity = Math.max(0, 1 - progress * 2);
  const ease = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  const transition = animating && !dragging ? `transform 0.45s ${ease}` : "none";
  const fillTransition = animating && !dragging ? `width 0.45s ${ease}` : "none";

  return (
    <div
      ref={trackRef}
      className="relative w-full h-14 rounded-full bg-secondary border border-border overflow-hidden select-none"
      style={{ touchAction: "none" }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 bg-foreground rounded-full"
        style={{
          width: dragX + HANDLE_SIZE + PADDING,
          transition: fillTransition,
        }}
      />
      {!completed && (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none"
          style={{
            opacity: textOpacity,
            color: progress > 0.35 ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
          }}
        >
          {loading ? loadingLabel || "Processing..." : label}
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute flex items-center justify-center rounded-full bg-foreground text-background shadow-card ${
          disabled || loading ? "opacity-40 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          top: PADDING,
          left: PADDING,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          transform: `translateX(${dragX}px)`,
          transition,
          touchAction: "none",
        }}
      >
        {completed ? (
          <Check className="w-5 h-5" strokeWidth={3} />
        ) : loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
        )}
      </div>
    </div>
  );
}