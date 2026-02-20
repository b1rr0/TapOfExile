# ── Stage 1: Build bot frontend ────────────────────────────
FROM node:20-alpine AS bot-build

WORKDIR /build/bot

COPY bot/package*.json ./
RUN npm ci

COPY shared/ /build/shared/
COPY bot/ .

RUN npm run build

# ── Stage 2: Build wiki frontend ──────────────────────────
FROM node:20-alpine AS wiki-build

WORKDIR /build/wiki

COPY wiki/package*.json ./
RUN npm ci

COPY shared/ /build/shared/
COPY wiki/ .

RUN npm run build

# ── Stage 3: Build NestJS server ──────────────────────────
FROM node:20-alpine AS server-build

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY shared/ ./shared/
COPY server/ .

RUN npm run build

# ── Stage 4: Production image ─────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=server-build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/shared ./shared
COPY --from=bot-build /build/bot/dist ./public/bot
COPY --from=wiki-build /build/wiki/dist ./public/wiki

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
