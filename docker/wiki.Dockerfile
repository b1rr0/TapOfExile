# ── Build stage ───────────────────────────────────────────
FROM node:20-alpine AS build

# Use /build/wiki as workdir so ../shared resolves to /build/shared
WORKDIR /build/wiki

COPY wiki/package*.json ./
RUN npm ci

# Place shared at /build/shared — vite alias "../shared" resolves correctly
COPY shared/ /build/shared/

# Copy wiki source
COPY wiki/ .

RUN npm run build

# ── Serve stage (nginx) ──────────────────────────────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

# Vite copies public/ into dist/ automatically
COPY --from=build /build/wiki/dist /usr/share/nginx/html

EXPOSE 80
