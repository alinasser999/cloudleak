"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type CodeLine = { text: string; cls?: string };

/**
 * Self-typing terminal. Types the given colored lines character-by-character
 * after mount, with a blinking caret on the active line. The full text is the
 * accessible/baseline content (aria-label), so it never ships blank to crawlers
 * or reduced-motion users, who see the finished code immediately.
 */
export function TypingCode({
  lines,
  speed = 16,
  startDelay = 240,
  className = "",
}: {
  lines: CodeLine[];
  speed?: number;
  startDelay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLPreElement>(null);

  const full = lines.map((l) => l.text).join("\n");
  const [count, setCount] = useState(reduce ? full.length : 0);

  useEffect(() => {
    if (reduce) return;
    setCount(0);
    let i = 0;
    let tick: ReturnType<typeof setInterval>;
    const begin = setTimeout(() => {
      tick = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= full.length) clearInterval(tick);
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(begin);
      clearInterval(tick);
    };
  }, [reduce, full.length, speed, startDelay]);

  const done = count >= full.length;

  // Map the global revealed-char count onto each line.
  let cursor = 0;
  const activeIndex = (() => {
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      acc += lines[i]!.text.length + 1; // +1 for the join newline
      if (count < acc) return i;
    }
    return lines.length - 1;
  })();

  return (
    <pre ref={ref} className={`overflow-x-auto p-4 ${className}`} aria-label={full}>
      {lines.map((line, i) => {
        const start = cursor;
        cursor += line.text.length + 1;
        const shown = Math.max(0, Math.min(line.text.length, count - start));
        const text = line.text.slice(0, shown);
        const showCaret = !reduce && !done && i === activeIndex;
        return (
          <span key={i} className={line.cls}>
            {text}
            {showCaret && <span className="type-caret" aria-hidden="true" />}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        );
      })}
    </pre>
  );
}
