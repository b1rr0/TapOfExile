# Tap of Exile — Telegram Mini App Game

Telegram bot with an HTML5 mini-game (tap clicker).

## Project Structure

```
bot/
├── bot.js              # Telegram bot (entry point)
├── index.html          # Game HTML page
├── src/
│   ├── main.js         # Game logic
│   └── style.css       # Styles
├── public/             # Static assets
├── vite.config.js      # Vite config
├── package.json
├── .env.example        # Environment variables example
└── .gitignore
```

## Requirements

- Node.js 18+
- npm
- Telegram bot (create one via [@BotFather](https://t.me/BotFather))
- HTTPS address for Mini App (for development — Cloudflare Tunnel)

## Installation

```bash
cd bot
npm install
```

## Configuration

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token.

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Fill in `.env`:

```
BOT_TOKEN=123456:ABC-DEF...
WEBAPP_URL=https://your-url.trycloudflare.com
```

## Running (development)

### 1. Start the Vite dev server

```bash
npm run dev
```

Vite will start a local server at `http://localhost:3000`.

### 2. Expose HTTPS via Cloudflare Tunnel

In a separate terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Copy the HTTPS address (e.g. `https://xxxx.trycloudflare.com`) and set it in `.env` as `WEBAPP_URL`.

### 3. Start the bot

In another terminal:

```bash
npm run bot
```

### 4. Open the bot in Telegram

Find your bot, send `/start` — a button to launch the game will appear.

## Production Build

```bash
npm run build
```

Built files will be in the `dist/` folder. Deploy them to any HTTPS hosting (Vercel, Netlify, Cloudflare Pages, etc.).

## How It Works

- **bot.js** — Telegraf bot, sends an inline button with a link to the Mini App
- **index.html + src/** — HTML5 mini-game (tap clicker), connects to the Telegram Web App SDK
- When the TAP button is pressed — the score increases, the train animates, and the phone vibrates (Haptic Feedback)
