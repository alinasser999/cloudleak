"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Cursor-reactive dot field. A fixed overlay whose teal dots (aligned to the
 * 42px body grid) only show through a soft spotlight that follows the pointer,
 * so the matrix appears to light up under the cursor. Pure CSS mask driven by
 * two custom properties, updated on a rAF-throttled pointermove.
 *
 * Renders nothing under reduced-motion or on coarse (touch) pointers.
 */
export function CursorField() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let mx = -999;
    let my = -999;
    let pending = false;

    const apply = () => {
      pending = false;
      el.style.setProperty("--mx", `${mx}px`);
      el.style.setProperty("--my", `${my}px`);
      el.style.opacity = "1";
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!pending) {
        pending = true;
        raf = requestAnimationFrame(apply);
      }
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  if (reduce) return null;

  return <div ref={ref} aria-hidden="true" className="cursor-field" />;
}
