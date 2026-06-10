/**
 * Hero texture for the light theme: a faded dot-matrix with a soft clay wash.
 * CSS-only (no JS), silenced by the global prefers-reduced-motion rule. Place
 * inside a `relative` container. Pair with <Terrain /> for the live mesh.
 */
export function Backdrop({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand/10 blur-[120px]" />
      <div className="absolute -right-40 top-10 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-80" />
    </div>
  );
}
