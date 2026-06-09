"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber, fadeUp, staggerParent } from "../../../components/motion";
import { Panel, StatTile } from "../../../components/ui";
import { IconServer, IconDollar, IconSliders } from "../../../components/icons";

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
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-full px-3 py-1 capitalize transition-colors duration-150 ${
        active ? "text-canvas" : "bg-line/[0.04] text-ink-muted hover:bg-line/10 hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="resource-filter-pill"
          className="absolute inset-0 rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

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
    <div className="max-w-5xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Resources</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Inventory from your most recent scan, with estimated monthly cost.
        </p>
      </div>

      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <motion.div variants={fadeUp}>
          <StatTile
            label="Total resources"
            icon={<IconServer className="h-4 w-4" />}
            value={<AnimatedNumber value={resources.length} />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            hero
            label="Est. monthly cost"
            icon={<IconDollar className="h-4 w-4" />}
            value={<AnimatedNumber value={totalCost} format={usd} />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Types"
            icon={<IconSliders className="h-4 w-4" />}
            value={<AnimatedNumber value={Object.keys(byType).length} />}
          />
        </motion.div>
      </motion.div>

      {resources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            All ({resources.length})
          </FilterPill>
          {TYPES.filter((t) => byType[t]).map((t) => (
            <FilterPill key={t} active={filter === t} onClick={() => setFilter(t)}>
              {label(t)} ({byType[t]})
            </FilterPill>
          ))}
        </div>
      )}

      {loaded && resources.length === 0 ? (
        <Panel className="px-4 py-3.5 text-sm text-ink-muted">
          No resources yet.{" "}
          <a className="font-medium text-brand-bright hover:underline" href="/scans">
            Run a scan
          </a>{" "}
          to populate your inventory.
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line/10 bg-surface-raised/40 text-left">
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Type</th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Resource</th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Region</th>
                <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Monthly cost</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.025, 0.4), ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-line/5 last:border-0 hover:bg-line/[0.03]"
                >
                  <td className="px-4 py-3 capitalize text-ink">{label(r.resourceType)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{r.resourceId}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.region}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-ink">
                    {usd(r.estimatedMonthlyCost ?? 0)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
