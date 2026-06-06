"use client";
import { useEffect, useMemo, useState } from "react";

interface Resource {
  id: string;
  resourceId: string;
  resourceType: string;
  region: string;
  estimatedMonthlyCost: number | null;
}

const TYPES = [
  "ec2_instance",
  "ebs_volume",
  "ebs_snapshot",
  "elastic_ip",
  "rds_instance",
  "load_balancer",
] as const;

const label = (t: string) => t.replace(/_/g, " ");
const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ResourcesClient({ organizationId }: { organizationId: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/resources?organizationId=${organizationId}`);
      if (res.ok) setResources((await res.json()).resources);
      setLoaded(true);
    })();
  }, [organizationId]);

  const totalCost = useMemo(
    () => resources.reduce((a, r) => a + (r.estimatedMonthlyCost ?? 0), 0),
    [resources],
  );
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of resources) m[r.resourceType] = (m[r.resourceType] ?? 0) + 1;
    return m;
  }, [resources]);

  const shown = filter === "all" ? resources : resources.filter((r) => r.resourceType === filter);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        <p className="mt-1 text-sm text-ink/60">
          Inventory from your most recent scan, with estimated monthly cost.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Total resources</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{resources.length}</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-brand/[0.04] p-4">
          <div className="text-xs uppercase tracking-wider text-brand-dark/70">
            Est. monthly cost
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-brand-dark">
            {usd(totalCost)}
          </div>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Types</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{Object.keys(byType).length}</div>
        </div>
      </div>

      {resources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 transition ${
              filter === "all" ? "bg-ink text-white" : "bg-ink/5 text-ink/70 hover:bg-ink/10"
            }`}
          >
            All ({resources.length})
          </button>
          {TYPES.filter((t) => byType[t]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                filter === t ? "bg-ink text-white" : "bg-ink/5 text-ink/70 hover:bg-ink/10"
              }`}
            >
              {label(t)} ({byType[t]})
            </button>
          ))}
        </div>
      )}

      {loaded && resources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-3 text-sm text-ink/60">
          No resources yet.{" "}
          <a className="font-medium text-brand-dark hover:underline" href="/scans">
            Run a scan
          </a>{" "}
          to populate your inventory.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Resource</th>
                <th className="px-4 py-2.5 font-medium">Region</th>
                <th className="px-4 py-2.5 text-right font-medium">Monthly cost</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.015]">
                  <td className="px-4 py-3 capitalize text-ink/80">{label(r.resourceType)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/70">{r.resourceId}</td>
                  <td className="px-4 py-3 text-ink/60">{r.region}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {usd(r.estimatedMonthlyCost ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
