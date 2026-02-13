# ── Build stage ───────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first (cache layer)
COPY server/package*.json ./
RUN npm ci

# Copy shared module (mapped via tsconfig paths → shared/*)
COPY shared/ ./shared/

# Copy server source
COPY server/ .

RUN npm run build

# ── Run stage ─────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
