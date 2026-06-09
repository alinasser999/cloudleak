FROM node:22-alpine AS base
RUN npm install -g pnpm@9

# ─── deps ───────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/aws/package.json packages/aws/
COPY packages/collectors/package.json packages/collectors/
COPY packages/rules/package.json packages/rules/
COPY packages/remediation/package.json packages/remediation/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ─── builder ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/config/node_modules packages/config/node_modules 2>/dev/null || true
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @cloudleak/web build

# ─── runner ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
