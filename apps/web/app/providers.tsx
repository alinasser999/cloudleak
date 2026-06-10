"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

// App-wide motion context. `reducedMotion="user"` makes every framer-motion
// animation honor the OS "reduce motion" setting, so we don't repeat the guard
// per route group.
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
