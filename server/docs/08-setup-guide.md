# Setup Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev without Docker)

## Quick Start (Docker)

```bash
cd server

# Copy env file and set BOT_TOKEN
cp .env.example .env
# Edit .env and set your BOT_TOKEN and JWT_SECRET

# Start all services
docker compose up

# API will be available at http://localhost:3001
# Swagger docs at http://localhost:3001/api/docs
```

## Local Development (without Docker)

```bash
# 1. Start PostgreSQL and Redis manually or via Docker
docker compose up postgres redis

# 2. Update .env for local connection
#    DB_HOST=localhost
#    REDIS_HOST=localhost

# 3. Install dependencies
npm install

# 4. Start dev server (with hot reload)
npm run start:dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| NODE_ENV | development | Environment |
| BOT_TOKEN | - | Telegram bot token (required) |
| DB_HOST | postgres | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | tap_of_exile | Database name |
| DB_USER | tap_of_exile | Database user |
| DB_PASSWORD | tap_of_exile_dev | Database password |
| REDIS_HOST | redis | Redis host |
| REDIS_PORT | 6379 | Redis port |
| JWT_SECRET | - | JWT signing secret (required) |
| JWT_ACCESS_EXPIRY | 3600 | Access token TTL (seconds) |
| JWT_REFRESH_EXPIRY | 2592000 | Refresh token TTL (seconds) |
| GAME_VERSION | 4 | Current game data version |
| MIN_CLIENT_VERSION | 4 | Minimum client version |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| api | 3001 | NestJS application |
| postgres | 5432 | PostgreSQL 16 database |
| redis | 6379 | Redis 7 cache |

## Database

Schema is auto-synced in development (`synchronize: true`).
For production, use TypeORM migrations:

```bash
# Generate migration from entity changes
npm run migration:generate -- src/database/migrations/MyMigration

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Verify Installation

```bash
# Health check
curl http://localhost:3001/game-data/version
# Should return: {"version":4,"minClientVersion":4}

# Swagger
open http://localhost:3001/api/docs
```
