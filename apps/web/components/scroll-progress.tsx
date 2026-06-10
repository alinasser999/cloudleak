"use client";

import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * Page-read progress: a thin clay-teal bar pinned to the very top that fills
 * left-to-right as the visitor scrolls. Reads as a live operations readout,
 * not decoration. Removed entirely under prefers-reduced-motion.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand to-accent"
    />
  );
}
