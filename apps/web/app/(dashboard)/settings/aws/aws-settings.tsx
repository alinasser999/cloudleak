"use client";
import { useEffect, useState } from "react";

interface Account {
  id: string;
  accountId: string | null;
  status: string;
  externalId: string;
  roleArn: string | null;
}

interface InitResult {
  account: Account;
  terraform: string;
  roleName: string;
  cloudleakAccountId: string;
}

export function AwsSettings({ organizationId }: { organizationId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [init, setInit] = useState<InitResult | null>(null);
  const [accountId, setAccountId] = useState("");
  const [roleArn, setRoleArn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/aws/accounts?organizationId=${organizationId}`);
    if (res.ok) setAccounts((await res.json()).accounts);
  }
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startConnect() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/aws/connect/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    if (res.ok) setInit(await res.json());
    else setError("Could not start connection");
    setBusy(false);
  }

  async function validate(e: React.FormEvent) {
    e.preventDefault();
    if (!init) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/aws/connect/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId, id: init.account.id, accountId, roleArn }),
    });
    if (res.ok) {
      setInit(null);
      setAccountId("");
      setRoleArn("");
      await refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Validation failed");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">AWS accounts</h1>
        <p className="mt-1 text-sm text-ink/60">
          Connect an account with a read-only cross-account role. CloudLeak never asks for
          access keys.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
          Connected
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-ink/50">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-ink/10 rounded-lg border border-ink/10">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{a.accountId ?? "Pending account"}</span>
                <span
                  className={
                    a.status === "connected"
                      ? "text-brand-dark"
                      : a.status === "error"
                        ? "text-red-600"
                        : "text-ink/50"
                  }
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!init ? (
        <button
          onClick={startConnect}
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Connect AWS"}
        </button>
      ) : (
        <section className="space-y-4 rounded-lg border border-ink/10 p-4">
          <div>
            <h2 className="text-sm font-semibold">1. Apply this Terraform</h2>
            <p className="text-xs text-ink/50">
              External ID: <code className="font-mono">{init.account.externalId}</code>
            </p>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-ink p-3 text-xs text-white">
              {init.terraform}
            </pre>
          </div>
          <form onSubmit={validate} className="space-y-3">
            <h2 className="text-sm font-semibold">2. Paste the results</h2>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="12-digit AWS account id"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            />
            <input
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/CloudLeakReadOnly"
              className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Validating…" : "Validate connection"}
            </button>
          </form>
        </section>
      )}
      {error && !init && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
