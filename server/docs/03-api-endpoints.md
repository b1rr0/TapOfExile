# API Endpoints

Base URL: `http://localhost:3001`
Swagger UI: `http://localhost:3001/api/docs`

## Auth

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/telegram` | - | `{initData}` | Authenticate via Telegram, returns JWT |
| POST | `/auth/refresh` | - | `{refreshToken}` | Refresh access token |

## Player

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/player` | JWT | Full player state (gold, characters, meta) |

## Characters

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/characters` | JWT | - | List all characters |
| POST | `/characters` | JWT | `{nickname, classId}` | Create character |
| GET | `/characters/:id` | JWT | - | Get character details |
| POST | `/characters/:id/activate` | JWT | - | Set as active character |
| PUT | `/characters/:id/skin` | JWT | `{skinId}` | Change skin |

## Combat

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/combat/tap` | JWT | `{sessionId}` | Process tap (server calculates damage) |
| POST | `/combat/complete` | JWT | `{sessionId}` | Complete session, claim rewards |
| POST | `/combat/flee` | JWT | `{sessionId}` | Abandon session |

## Loot

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/loot/bag?characterId=` | JWT | Get bag contents |
| DELETE | `/loot/bag/:itemId?characterId=` | JWT | Discard item |

## Skill Tree

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/skill-tree?characterId=` | JWT | - | Get tree + allocations |
| POST | `/skill-tree/allocate` | JWT | `{characterId, nodeId}` | Allocate node |
| POST | `/skill-tree/reset` | JWT | `{characterId}` | Reset all (costs gold) |

## Endgame

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/endgame/status?characterId=` | JWT | Endgame progress |
| POST | `/endgame/check-unlock?characterId=` | JWT | Check/unlock endgame |

## Game Data (public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/game-data/balance` | - | Balance constants |
| GET | `/game-data/version` | - | Game version info |
| GET | `/game-data/classes` | - | Character classes |
| GET | `/game-data/endgame` | - | Endgame tiers, bosses, drop settings |

## Rewards

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/rewards/daily` | JWT | Daily reward info (day, canClaim) |
| POST | `/rewards/daily/claim` | JWT | Claim daily reward |
| GET | `/rewards/achievements` | JWT | Achievement list (future) |

## Migration

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/migration/import-local` | JWT | `{gameData}` | Import localStorage to server |

## Rate Limits
- Global: 100 req/min per IP
- `/combat/tap`: 20 req/sec
- `/auth/telegram`: 5 req/min
