"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_OUT } from "./motion";

/**
 * Word-by-word headline reveal: each word rises out from under a clip mask and
 * fades in, staggered left-to-right. Use \n in `text` to force line breaks.
 *
 * Honors prefers-reduced-motion (renders the plain heading, no motion) and keeps
 * the full string as an aria-label so it reads as one phrase, not loose words.
 */
const wordVariant: Variants = {
  hidden: { y: "1em", opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.62, ease: EASE_OUT } },
};

export function RevealText({
  text,
  as = "span",
  className = "",
  delay = 0,
  stagger = 0.05,
  startOnView = false,
}: {
  text: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  stagger?: number;
  startOnView?: boolean;
}) {
  const reduce = useReducedMotion();
  const lines = text.split("\n");

  if (reduce) {
    const Tag = as as "span";
    return (
      <Tag className={className}>
        {lines.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </Tag>
    );
  }

  const MotionTag = motion[as as "span"] as typeof motion.span;
  const trigger = startOnView
    ? { whileInView: "show" as const, viewport: { once: true, margin: "-12% 0px" } }
    : { animate: "show" as const };

  return (
    <MotionTag
      className={className}
      aria-label={text.replace(/\n/g, " ")}
      initial="hidden"
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...trigger}
    >
      {lines.map((line, li) => (
        <span key={li} aria-hidden className="block">
          {line.split(" ").map((w, wi) => (
            <span
              key={wi}
              className="mr-[0.26em] inline-block overflow-hidden align-bottom leading-[1.05]"
            >
              <motion.span variants={wordVariant} className="inline-block">
                {w}
              </motion.span>
            </span>
          ))}
        </span>
      ))}
    </MotionTag>
  );
}
