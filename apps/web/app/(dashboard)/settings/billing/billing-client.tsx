"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerParent } from "../../../../components/motion";
import { useToast } from "../../../../components/toast";

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
  },
  {
    id: "growth",
    label: "Growth",
    price: "$49/mo",
    features: ["5 AWS accounts", "Unlimited findings", "Weekly digest", "Priority support"],
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH",
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

  if (!data) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-ink/50">
          Manage your subscription plan and payment details.
        </p>
      </div>

      {/* Current plan badge */}
      <div className="flex items-center gap-3 rounded-xl border border-ink/10 p-4">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/40">Current plan</p>
          <p className="mt-0.5 text-lg font-semibold capitalize">{currentPlan}</p>
          {data.sub?.currentPeriodEnd && (
            <p className="text-xs text-ink/40">
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
            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            {busy === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </div>

      {/* Plan cards */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-4"
      >
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              whileHover={isCurrent ? undefined : { y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className={`rounded-xl border p-5 ${
                isCurrent ? "border-brand bg-brand/[0.03]" : "border-ink/10"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{plan.label}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1">{plan.price}</p>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand-dark">
                    Current
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink/70">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 text-brand"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                    </svg>
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
                  className="mt-4 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy === plan.priceEnvKey ? "Redirecting…" : `Upgrade to ${plan.label}`}
                </motion.button>
              )}
              {plan.id === "starter" && !isCurrent && (
                <p className="mt-4 text-xs text-ink/40 text-center">
                  Downgrade via billing portal
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
