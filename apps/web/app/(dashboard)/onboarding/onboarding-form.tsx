"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary } from "../../../components/ui";
import { IconArrowRight } from "../../../components/icons";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      router.push("/settings/aws");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not create organization");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink">Organization name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          className="mt-1.5 w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={busy || name.trim().length < 2} className={btnPrimary + " w-full"}>
        {busy ? "Creating…" : "Create organization"}
        {!busy && <IconArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
