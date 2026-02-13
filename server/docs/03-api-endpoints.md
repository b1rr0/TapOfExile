# API Endpoints

Base URL: `http://localhost:3001/api`
Swagger UI: `http://localhost:3001/api/docs`

## REST Endpoints

### Auth

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/telegram` | - | `{initData}` | Authenticate via Telegram, returns JWT |
| POST | `/auth/refresh` | - | `{refreshToken}` | Refresh access token |

### Player

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/player` | JWT | Full player state (all leagues, characters, bag, meta) |

### Characters

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/characters` | JWT | - | List all characters in active league |
| POST | `/characters` | JWT | `{nickname, classId, leagueId?}` | Create character (max 10/league) |
| GET | `/characters/:id` | JWT | - | Get character details |
| POST | `/characters/:id/activate` | JWT | - | Set as active character |
| PUT | `/characters/:id/skin` | JWT | `{skinId}` | Change skin |

### Leagues

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/leagues` | - | - | List all active leagues |
| GET | `/leagues/my` | JWT | - | Player's league memberships |
| POST | `/leagues/:leagueId/join` | JWT | - | Join a league |
| POST | `/leagues/switch` | JWT | `{leagueId}` | Switch active league |

### Loot

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/loot/bag` | JWT | Get bag items for active league |
| DELETE | `/loot/bag/:itemId` | JWT | Discard item from bag |

### Skill Tree

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/skill-tree?characterId=` | JWT | - | Get allocated node IDs |
| POST | `/skill-tree/accept` | JWT | `{characterId, allocated[]}` | Bulk save allocations |
| POST | `/skill-tree/reset` | JWT | `{characterId}` | Reset all (costs 100 gold/node) |

### Endgame

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/endgame/status?characterId=` | JWT | Endgame progress |
| POST | `/endgame/check-unlock?characterId=` | JWT | Check/unlock endgame |

## WebSocket Events (Socket.IO `/combat` namespace)

All combat operations use WebSocket instead of REST.

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `combat:start-location` | `{locationId, waves, order, act}` | Start story combat |
| `combat:start-map` | `{mapKeyItemId, direction?}` | Start endgame map |
| `combat:tap` | `{sessionId}` | Player attack |
| `combat:entrance-done` | `{sessionId}` | Monster entrance animation done |
| `combat:complete` | `{sessionId}` | Request rewards |
| `combat:flee` | `{sessionId}` | Abandon combat |
| `combat:reconnect` | `{sessionId}` | Resume after disconnect |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `combat:started` | `{sessionId, totalMonsters, currentMonster, playerHp, playerMaxHp}` | Session created |
| `combat:tap-result` | `{damage, isCrit, monsterHp, killed, isComplete, playerHp, ...}` | Tap result |
| `combat:enemy-attack` | `{attacks[], playerHp, playerMaxHp, playerDead}` | Server tick (200ms) |
| `combat:completed` | `{totalGold, totalXp, level, mapDrops, ...}` | Rewards |
| `combat:player-died` | `{sessionId}` | Player HP <= 0 |
| `combat:fled` | `{success}` | Flee confirmed |
| `combat:reconnected` | `{sessionId, currentMonster, playerHp, ...}` | Session resumed |
| `combat:error` | `{message}` | Error |

## Rate Limits

| Scope | Limit | Location |
|-------|-------|----------|
| Global | 100 req/60s | `app.module.ts` ThrottlerModule |
| `/auth/telegram` | 5 req/60s | `auth.controller.ts` @Throttle |
| Tap interval | min 50ms | `combat.service.ts` MIN_TAP_INTERVAL_MS |
