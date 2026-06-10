"use client";
import { useEffect, useState } from "react";
import { Panel, Eyebrow, PageHeading, btnPrimary } from "../../../../components/ui";
import { IconCloud, IconShield, IconCheck } from "../../../../components/icons";

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

const STATUS_STYLES: Record<string, string> = {
  connected: "text-brand-bright",
  error: "text-rose-600",
};

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

  const inputCls =
    "w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25";

  return (
    <div className="max-w-2xl space-y-7">
      <PageHeading title="AWS accounts">
        Connect an account with a read-only cross-account role. CloudLeak never asks for access
        keys.
      </PageHeading>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/[0.05] px-4 py-3.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand-bright">
          <IconShield className="h-4 w-4" />
        </span>
        <p className="text-sm leading-relaxed text-ink-muted">
          We use a scoped, read-only cross-account IAM role with a unique external ID. CloudLeak can
          describe and list resources. It can never modify or delete anything.
        </p>
      </div>

      <section className="space-y-3">
        <Eyebrow>Connected</Eyebrow>
        {accounts.length === 0 ? (
          <p className="text-sm text-ink-muted">No accounts yet.</p>
        ) : (
          <Panel className="divide-y divide-line/8 overflow-hidden">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                <span className="flex items-center gap-3 text-ink">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-line/8 text-ink-muted">
                    <IconCloud className="h-4 w-4" />
                  </span>
                  <span className="font-mono">{a.accountId ?? "Pending account"}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-medium capitalize ${
                    STATUS_STYLES[a.status] ?? "text-ink-muted"
                  }`}
                >
                  {a.status === "connected" && <IconCheck className="h-3.5 w-3.5" />}
                  {a.status}
                </span>
              </div>
            ))}
          </Panel>
        )}
      </section>

      {!init ? (
        <button onClick={startConnect} disabled={busy} className={btnPrimary}>
          <IconCloud className="h-4 w-4" />
          {busy ? "Preparing…" : "Connect AWS"}
        </button>
      ) : (
        <Panel className="space-y-5 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand/15 font-mono text-[11px] text-brand-bright">1</span>
              Apply this Terraform
            </h2>
            <p className="mt-2 text-xs text-ink-muted">
              External ID:{" "}
              <code className="rounded bg-line/10 px-1.5 py-0.5 font-mono text-brand-bright">
                {init.account.externalId}
              </code>
            </p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-ink/15 bg-ink p-4 font-mono text-xs leading-relaxed text-[#a7e8e2] shadow-inner">
              {init.terraform}
            </pre>
          </div>
          <form onSubmit={validate} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand/15 font-mono text-[11px] text-brand-bright">2</span>
              Paste the results
            </h2>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="12-digit AWS account id"
              className={inputCls}
            />
            <input
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/CloudLeakReadOnly"
              className={inputCls}
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Validating…" : "Validate connection"}
            </button>
          </form>
        </Panel>
      )}
      {error && !init && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}
