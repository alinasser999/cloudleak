"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      router.push("/settings/aws");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Could not accept invite");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        onClick={accept}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright disabled:opacity-50"
      >
        {busy ? "Joining…" : "Accept invite"}
      </button>
    </div>
  );
}
