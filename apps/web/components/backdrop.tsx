/**
 * Atmospheric drench for hero surfaces: drifting emerald/teal blooms over a
 * faint blueprint grid. CSS-driven (drift-* keyframes) so it costs no JS and
 * is silenced by the global prefers-reduced-motion rule. Place inside a
 * `relative` container.
 */
export function Backdrop({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="absolute -left-40 -top-44 h-[40rem] w-[40rem] rounded-full bg-brand/25 blur-[130px] animate-drift-a" />
      <div className="absolute -right-44 top-0 h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-[120px] animate-drift-b" />
      <div className="absolute -bottom-52 left-1/4 h-[36rem] w-[36rem] rounded-full bg-brand-deep/25 blur-[140px] animate-drift-a" />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-70" />
    </div>
  );
}
