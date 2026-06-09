"use client";

import {
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  motion,
  type MotionValue,
} from "framer-motion";
import { useEffect } from "react";

/**
 * Shared motion vocabulary for CloudLeak. One rhythm everywhere:
 * ease-out for entrances, spring for direct manipulation, short exits.
 */

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]; // ease-out-expo-ish

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};

export const staggerParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/**
 * Animated numeric counter. Counts from 0 → value on mount.
 * Honors prefers-reduced-motion by snapping straight to the value.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text: MotionValue<string> = useTransform(mv, (n) => format(n));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}

/** Tappable wrapper that scales subtly on press (cards, buttons). */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 400, damping: 25 },
};
