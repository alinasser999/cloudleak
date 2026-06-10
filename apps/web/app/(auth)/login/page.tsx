"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { browserSupabase } from "@/lib/supabase/browser";
import { Backdrop } from "../../../components/backdrop";
import { EASE_OUT } from "../../../components/motion";
import { Sparkline, btnPrimary } from "../../../components/ui";
import { IconLeaf, IconCheck, IconTrendDown, IconShield } from "../../../components/icons";

const VALUE_PROPS = [
  "Find idle EC2, EBS, snapshots, EIPs and RDS",
  "Copy-paste Terraform diff for every fix",
  "Read-only role. We never ask for access keys",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const signInOAuth = (provider: "google" | "github") =>
    browserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const sb = browserSupabase();
    const { error } =
      mode === "signin"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (mode === "signup") {
      setError(null);
      setBusy(false);
      setMode("signin");
      setError("Check your email to confirm your account, then sign in.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-line/10 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Backdrop />
        <Link href="/" className="flex items-center gap-2 text-ink">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand-bright">
            <IconLeaf className="h-4 w-4" />
          </span>
          <span className="font-display text-base uppercase tracking-[0.08em]">CloudLeak</span>
        </Link>

        <div className="max-w-md">
          <h2 className="text-balance font-display text-[2.4rem] uppercase leading-[0.95] tracking-[0.01em] text-ink sm:text-[2.7rem]">
            Find AWS waste before your bill does.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {VALUE_PROPS.map((v) => (
              <li key={v} className="flex items-start gap-3 text-sm text-ink-muted">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/20 text-brand-bright">
                  <IconCheck className="h-3 w-3" />
                </span>
                {v}
              </li>
            ))}
          </ul>

          {/* mini savings card */}
          <div className="ring-glow mt-10 max-w-xs overflow-hidden rounded-2xl border border-brand/25 bg-brand/[0.07] p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-bright/80">
              Avg. savings found
            </div>
            <div className="mt-1.5 flex items-end gap-2">
              <span className="font-display text-3xl tabular-nums text-brand">
                $3,140
              </span>
              <span className="mb-1 inline-flex items-center gap-1 text-xs text-brand-bright">
                <IconTrendDown className="h-3.5 w-3.5" /> /mo
              </span>
            </div>
            <Sparkline data={[6, 8, 7, 11, 13, 12, 18, 22, 28, 34]} className="mt-3 h-10 w-full" />
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-ink-faint">
          <IconShield className="h-3.5 w-3.5 text-brand-bright/70" />
          Read-only cross-account access. Revoke any time.
        </p>
      </aside>

      {/* Form */}
      <section className="relative flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="w-full max-w-sm"
        >
          <Link href="/" className="mb-8 flex items-center gap-2 text-ink lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand-bright">
              <IconLeaf className="h-4 w-4" />
            </span>
            <span className="font-display text-base uppercase tracking-[0.08em]">CloudLeak</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {mode === "signin"
              ? "Sign in to manage your AWS cost findings."
              : "Start finding AWS waste in minutes."}
          </p>

          <div className="mt-7 space-y-3">
            <button
              onClick={() => void signInOAuth("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-white/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => void signInOAuth("github")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-line/15 bg-line/[0.04] px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-line/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line/10" />
            or continue with email
            <span className="h-px flex-1 bg-line/10" />
          </div>

          <form onSubmit={(e) => void handleEmail(e)} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
              required
            />
            {error && (
              <p className={`text-sm ${error.startsWith("Check") ? "text-brand-bright" : "text-rose-600"}`}>
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className={btnPrimary + " w-full py-2.5"}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button onClick={() => { setMode("signup"); setError(null); }} className="font-medium text-brand-bright hover:underline">
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(null); }} className="font-medium text-brand-bright hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </section>
    </main>
  );
}
