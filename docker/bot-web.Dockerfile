# ── Build stage ───────────────────────────────────────────
FROM node:20-alpine AS build

# Use /build/bot as workdir so ../shared resolves to /build/shared
WORKDIR /build/bot

COPY bot/package*.json ./
RUN npm ci

# Place shared at /build/shared — vite alias "../shared" resolves correctly
COPY shared/ /build/shared/

# Copy bot source
COPY bot/ .

RUN npm run build

# ── Serve stage (nginx) ──────────────────────────────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

# Vite copies public/ into dist/ automatically, so assets are at dist/assets/
COPY --from=build /build/bot/dist /usr/share/nginx/html

EXPOSE 80
