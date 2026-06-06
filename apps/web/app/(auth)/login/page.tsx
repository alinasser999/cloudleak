"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signInOAuth = (provider: "google" | "github") =>
    browserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await browserSupabase().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to CloudLeak</h1>
        <p className="mt-1 text-sm text-ink/60">
          Connect your AWS account and find waste in minutes.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => signInOAuth("google")}
          className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-ink/5"
        >
          Continue with Google
        </button>
        <button
          onClick={() => signInOAuth("github")}
          className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
        >
          Continue with GitHub
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={signInEmail} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in with email"}
        </button>
      </form>
    </main>
  );
}
