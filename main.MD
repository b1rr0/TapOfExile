# Tap of Exile — Project Overview

## Architecture

| Service       | Stack                        | Port  | Directory  |
|---------------|------------------------------|-------|------------|
| **Server**    | NestJS + TypeORM + PostgreSQL | 3001  | `server/`  |
| **Bot Web**   | Vite + TypeScript (Mini-App) | 80    | `bot/`     |
| **Bot TG**    | Telegraf (Node.js)           | —     | `bot/`     |
| **Wiki**      | Vite + React + TypeScript    | 3003  | `wiki/`    |
| **PostgreSQL**| postgres:16-alpine           | 5432  | —          |
| **Redis**     | redis:7-alpine               | 6379  | —          |
| **Nginx**     | nginx:alpine (reverse proxy) | 80    | —          |

## Running

```bash
# Start all services
docker compose up --build

# Start specific service
docker compose up wiki --build
```

## Wiki Site

The wiki (`wiki/`) is a standalone React SPA that contains game reference information:

- **Characters** — All 4 classes (Warrior, Samurai, Mage, Archer) with stats, growth rates, and level previews
- **Equipment** — Potions, flask types, quality tiers, map keys, and loot drop system
- **Enemies** — 8 monster types, 4 rarity tiers, elemental resistances, and attack patterns
- **Dojo** — Competitive 10-second damage challenge with leaderboard info (both leagues)
- **Skill Tree** — 200+ passive node overview, modifier types, and allocation mechanics
- **Damage & Formulas** — Elemental system, damage calculation, resistances, scaling formulas
- **Main Plot** — 5 acts (50 locations), progression rules, act modifiers, and story overview
- **Maps & Bosses** — 10 endgame tiers, 8 boss encounters, key drops, and boss key system
- **Trade** — Player-to-player trading (TBD — coming in a future update)

### Wiki Data Freshness

> **IMPORTANT:** The wiki currently uses static data hardcoded into the React components.
> It should be updated whenever game balance, content, or mechanics change.
>
> **Planned improvement:** In a future update, the wiki will auto-sync with the game
> database (PostgreSQL) to always display the latest information, including:
> - Live Dojo leaderboard rankings (real-time, both leagues)
> - Current game balance values
> - Latest character/enemy/item data
> - Player statistics and top players by experience

### Wiki Docker

- **Dockerfile:** `docker/wiki.Dockerfile`
- **Nginx config:** `docker/wiki-nginx.conf`
- **Port:** `WIKI_PORT` env var (default: 3003)

## Community Links

- Discord: https://discord.gg/mgCNqp9q
- Telegram Bot: https://t.me/Tap_Of_Exile_Bot (@Tap_Of_Exile_Bot)

## Directory Structure

```
TapOfExile/
├── bot/           # Telegram Mini-App frontend (Vite + Canvas)
├── server/        # NestJS API backend
├── shared/        # Shared types, balance data, game constants
├── wiki/          # Wiki website (Vite + React)
├── docker/        # Dockerfiles and nginx configs
├── docs/          # Game design documentation
├── scripts/       # Build/deployment scripts
├── docker-compose.yml
└── main.MD        # This file
```
