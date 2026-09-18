# syntax=docker/dockerfile:1

# --- Build -------------------------------------------------------------
FROM node:24.18.0-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
RUN pnpm run build
RUN pnpm prune --prod

# --- Runtime -------------------------------------------------------------
# alpine, not slim: the pruned production node_modules carry no native
# addons — checked via `find node_modules -name "*.node"` against a full
# install, the only hits were devDependency build tooling (vite's rolldown
# binding, @resvg/resvg-js used only by scripts/vendor-flags.mjs) and
# platform-specific dev tools (fsevents, lightningcss), none of which are
# production dependencies — so the smaller, lower-CVE base is safe here.
FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV PORT=3000
EXPOSE 3000

# MCP_AUTH_TOKEN is required at runtime (see src/transports/http.ts) and is
# intentionally not set here — provide it as a platform secret. This
# service is meant to sit on a private network with no public domain;
# MCP_AUTH_TOKEN is defense-in-depth on top of that, not a substitute for it.

USER node
CMD ["node", "dist/index.js", "--http"]
