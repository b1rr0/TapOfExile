FROM node:20-alpine

WORKDIR /app

COPY bot/package*.json ./
RUN npm ci --omit=dev

COPY bot/bot.ts ./
COPY bot/tsconfig.json ./

CMD ["npx", "tsx", "bot.ts"]
