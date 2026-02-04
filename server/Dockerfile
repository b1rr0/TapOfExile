FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/ .

# Copy shared module into /app/shared (referenced via @shared/* path alias → shared/*)
# This must come after COPY server/ to properly overwrite the junction/symlink
COPY shared/ ./shared/
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
