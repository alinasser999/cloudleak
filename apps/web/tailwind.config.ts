import type { Config } from "tailwindcss";

const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: withAlpha("--canvas"), 2: withAlpha("--canvas-2") },
        surface: { DEFAULT: withAlpha("--surface"), raised: withAlpha("--surface-raised") },
        line: withAlpha("--line"),
        ink: {
          DEFAULT: withAlpha("--ink"),
          muted: withAlpha("--ink-muted"),
          faint: withAlpha("--ink-faint"),
        },
        brand: {
          DEFAULT: withAlpha("--brand"),
          bright: withAlpha("--brand-bright"),
          deep: withAlpha("--brand-deep"),
          // Back-compat alias: older code referenced `brand-dark`.
          dark: withAlpha("--brand-deep"),
        },
        accent: withAlpha("--accent"),
      },
      fontFamily: {
        // Pixel display for headings, hero, big figures; Inter for body; mono for code.
        display: ["var(--font-display)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        // Soft neutral lift for the light theme (no colored halos).
        glow: "0 30px 60px -30px rgb(var(--ink) / 0.22)",
        "glow-sm": "0 14px 30px -16px rgb(var(--ink) / 0.2)",
      },
      keyframes: {
        "drift-a": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%,-3%,0) scale(1.08)" },
        },
        "drift-b": {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-5%,4%,0) scale(1.13)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        "drift-a": "drift-a 17s ease-in-out infinite",
        "drift-b": "drift-b 22s ease-in-out infinite",
        shimmer: "shimmer 2.2s infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
