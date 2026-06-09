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
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile

# ─── builder: compile TypeScript ────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN pnpm --filter @cloudleak/core build 2>/dev/null || true
RUN pnpm --filter @cloudleak/db build 2>/dev/null || true
RUN pnpm --filter @cloudleak/aws build 2>/dev/null || true
RUN pnpm --filter @cloudleak/collectors build 2>/dev/null || true
RUN pnpm --filter @cloudleak/rules build 2>/dev/null || true
RUN pnpm --filter @cloudleak/remediation build 2>/dev/null || true
COPY apps/worker/tsconfig.json apps/worker/
COPY apps/worker/src apps/worker/src
WORKDIR /repo/apps/worker
RUN pnpm exec tsc --outDir dist --declaration false

# ─── runner ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker

COPY --from=builder /repo/apps/worker/dist ./dist
COPY --from=builder /repo/node_modules ./node_modules

USER worker
CMD ["node", "dist/index.js"]
