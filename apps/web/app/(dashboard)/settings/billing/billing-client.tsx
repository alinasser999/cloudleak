"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerParent } from "../../../../components/motion";
import { useToast } from "../../../../components/toast";
import { Panel } from "../../../../components/ui";
import { IconCheck, IconCard } from "../../../../components/icons";

interface Subscription {
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
}

interface OrgSub {
  org: { id: string; name: string; plan: string };
  sub: Subscription | null;
}

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    price: "Free",
    features: ["1 AWS account", "50 findings/scan", "Weekly digest"],
    priceEnvKey: null,
    popular: false,
  },
  {
    id: "growth",
    label: "Growth",
    price: "$49/mo",
    features: ["5 AWS accounts", "Unlimited findings", "Weekly digest", "Priority support"],
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH",
    popular: true,
  },
  {
    id: "agency",
    label: "Agency",
    price: "$149/mo",
    features: [
      "Unlimited AWS accounts",
      "Unlimited findings",
      "Daily digest",
      "Dedicated support",
      "SSO",
    ],
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_AGENCY",
    popular: false,
  },
] as const;

export function BillingClient({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<OrgSub | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    void fetch(`/api/billing/subscription?organizationId=${organizationId}`)
      .then((r) => r.json())
      .then((d: OrgSub) => setData(d));
  }, [organizationId]);

  const currentPlan = data?.org.plan ?? "starter";
  const returnUrl = typeof window !== "undefined" ? window.location.href : "";

  async function upgrade(priceEnvKey: string) {
    const priceId = process.env[priceEnvKey];
    if (!priceId) {
      toast.error(`${priceEnvKey} env var not set`);
      return;
    }
    setBusy(priceEnvKey);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, priceId, returnUrl }),
    });
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } else {
      const d = (await res.json()) as { error?: { message?: string } };
      toast.error(d.error?.message ?? "Checkout failed");
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, returnUrl }),
    });
    if (res.ok) {
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } else {
      const d = (await res.json()) as { error?: { message?: string } };
      toast.error(d.error?.message ?? "Could not open billing portal");
      setBusy(null);
    }
  }

  if (!data) return <p className="text-sm text-ink-muted">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Manage your subscription plan and payment details.
        </p>
      </div>

      {/* Current plan badge */}
      <Panel className="flex items-center gap-3 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand-bright">
          <IconCard className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted/70">
            Current plan
          </p>
          <p className="mt-0.5 text-lg font-semibold capitalize text-ink">{currentPlan}</p>
          {data.sub?.currentPeriodEnd && (
            <p className="text-xs text-ink-muted">
              Renews{" "}
              {new Date(data.sub.currentPeriodEnd).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        {data.sub?.stripeSubscriptionId && (
          <button
            onClick={() => void openPortal()}
            disabled={busy === "portal"}
            className="rounded-xl border border-line/15 bg-line/[0.03] px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line/10 disabled:opacity-60"
          >
            {busy === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </Panel>

      {/* Plan cards */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              whileHover={isCurrent ? undefined : { y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className={`relative overflow-hidden rounded-2xl border p-5 panel-hairline ${
                isCurrent
                  ? "border-brand/40 bg-brand/[0.07]"
                  : plan.popular
                    ? "border-brand/25 bg-surface/60"
                    : "border-line/10 bg-surface/60"
              }`}
            >
              {plan.popular && !isCurrent && (
                <span className="absolute right-3 top-3 rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-brand-bright">
                  Popular
                </span>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">{plan.label}</p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-ink">{plan.price}</p>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-brand-bright">
                    Current
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand/15 text-brand-bright">
                      <IconCheck className="h-2.5 w-2.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && plan.priceEnvKey && (
                <motion.button
                  onClick={() => void upgrade(plan.priceEnvKey!)}
                  disabled={busy === plan.priceEnvKey}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="mt-5 w-full rounded-xl bg-brand py-2 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright disabled:opacity-60"
                >
                  {busy === plan.priceEnvKey ? "Redirecting…" : `Upgrade to ${plan.label}`}
                </motion.button>
              )}
              {plan.id === "starter" && !isCurrent && (
                <p className="mt-5 text-center text-xs text-ink-muted/70">Downgrade via billing portal</p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
