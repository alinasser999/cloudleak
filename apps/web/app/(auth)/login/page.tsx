"use client";
import { browserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const signIn = (provider: "google" | "github") =>
    browserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });

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
          onClick={() => signIn("google")}
          className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-ink/5"
        >
          Continue with Google
        </button>
        <button
          onClick={() => signIn("github")}
          className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink/90"
        >
          Continue with GitHub
        </button>
      </div>
    </main>
  );
}
