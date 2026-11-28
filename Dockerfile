# syntax=docker/dockerfile:1

FROM node:22-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN npm install --ignore-scripts

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY shared ./shared
COPY server ./server
COPY server.ts ./

RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server.ts ./
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/shared ./shared

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.ts"]
