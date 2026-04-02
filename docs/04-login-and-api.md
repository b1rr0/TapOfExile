# Login and API Requests

## Key Files

| File | Purpose |
|------|---------|
| `bot/src/api.ts` | FE API client, token management, auto-refresh |
| `bot/src/combat-socket.ts` | Socket.IO client (singleton, namespace `/combat`) |
| `bot/src/main.ts` | Application initialization |
| `bot/src/game/state.ts` | GameState.load() — login flow |
| `server/src/auth/auth.service.ts` | Telegram validation, JWT issuing |
| `server/src/auth/auth.controller.ts` | `/auth/*` endpoints |
| `server/src/auth/auth.guard.ts` | JwtAuthGuard |
| `server/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `server/src/shared/decorators/current-user.decorator.ts` | @CurrentUser |
| `server/src/main.ts` | Server: CORS, ValidationPipe, Swagger |

## Authentication Flow

```
1. FE: window.Telegram.WebApp.initData → base64-encoded Telegram data
2. FE: api.auth.login(initData)        → POST /api/auth/telegram
3. BE: validateTelegramInitData()      → HMAC-SHA256 signature verification
4. BE: findOrCreatePlayer()            → Creates Player if not exists
5. BE: issueTokens()                   → JWT access + refresh
6. FE: stores tokens in closure        → NOT in localStorage (ephemeral)
7. FE: state.load()                    → Loads full state
```

## Telegram Signature Validation (auth.service.ts)

```
1. Parse initData as URLSearchParams
2. Extract 'hash', remove from params
3. Sort remaining params alphabetically
4. Build dataCheckString: "key=value\nkey=value\n..."
5. secretKey = HMAC-SHA256('WebAppData', BOT_TOKEN)
6. checkHash = HMAC-SHA256(secretKey, dataCheckString).hex()
7. Compare checkHash === hash
8. Check auth_date: not older than 24 hours (86400 sec)
```

## JWT Tokens

| Token | Expiry | Storage |
|-------|--------|---------|
| Access | 1 hour (JWT_ACCESS_EXPIRY) | FE: closure variable (in-memory) |
| Refresh | 30 days (JWT_REFRESH_EXPIRY) | BE: Redis `auth:refresh:${telegramId}` |

**Payload**: `{ sub: telegramId, type: 'access' | 'refresh' }`

Tokens are **never** saved in localStorage/sessionStorage — lost on reload.

## Token Refresh (api.ts)

On receiving 401:
1. Call `POST /api/auth/refresh` with `{ refreshToken }`
2. Receive new `accessToken`
3. Retry the original request with the new token

## API Client (bot/src/api.ts)

Base URL: `import.meta.env.VITE_API_URL` or `/api`

All requests: `Authorization: Bearer ${accessToken}`

### REST API Modules

```
api.auth
  .login(initData)         → POST /auth/telegram
  .refresh()               → POST /auth/refresh
  .isAuthenticated()       → boolean

api.player
  .getState()              → GET /player

api.characters
  .list()                  → GET /characters
  .create(nickname, classId, leagueId?) → POST /characters
  .get(id)                 → GET /characters/:id
  .activate(id)            → POST /characters/:id/activate
  .changeSkin(id, skinId)  → PUT /characters/:id/skin

api.leagues
  .list()                  → GET /leagues
  .getMyLeagues()          → GET /leagues/my
  .join(leagueId)          → POST /leagues/:leagueId/join
  .switch(leagueId)        → POST /leagues/switch

api.skillTree
  .get(characterId)        → GET /skill-tree?characterId
  .accept(characterId, allocated) → POST /skill-tree/accept
  .reset(characterId)      → POST /skill-tree/reset

api.loot
  .getBag()                → GET /loot/bag
  .discardItem(itemId)     → DELETE /loot/bag/:itemId

api.endgame
  .status(characterId)     → GET /endgame/status?characterId
  .checkUnlock(characterId)→ POST /endgame/check-unlock?characterId
```

### WebSocket Events (Socket.IO `/combat` namespace)

Connection: `bot/src/combat-socket.ts` → singleton socket.

```
getAccessToken()           → Used for auth: { token } on connection

Client → Server:
  combat:start-location    → { locationId, waves, order, act }
  combat:start-map         → { mapKeyItemId, direction? }
  combat:tap               → { sessionId }
  combat:entrance-done     → { sessionId }
  combat:complete          → { sessionId }
  combat:flee              → { sessionId }
  combat:reconnect         → { sessionId }

Server → Client:
  combat:started           → { sessionId, totalMonsters, currentMonster, playerHp, playerMaxHp }
  combat:tap-result        → { damage, isCrit, monsterHp, killed, isComplete, playerHp, ... }
  combat:enemy-attack      → { attacks[], playerHp, playerMaxHp, playerDead }
  combat:completed         → { totalGold, totalXp, level, mapDrops, ... }
  combat:player-died       → { sessionId }
  combat:fled              → { success }
  combat:reconnected       → { sessionId, currentMonster, playerHp, ... }
  combat:error             → { message }
```

## FE Initialization (main.ts → state.ts)

```
1. api.auth.login(initData) — authentication
2. api.leagues.list()       — league list
3. Auto-join Standard league if no activeLeagueId
4. api.player.getState()    — full state (characters, gold, bag, meta)
5. Route to appropriate scene:
   - No characters → CharacterCreateScene
   - No active character → CharacterSelectScene
   - Has active character → HideoutScene
```

## Backend Infrastructure (server/src/main.ts)

- NestJS v10, prefix `/api`
- CORS: enabled, credentials: true
- Global ValidationPipe: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
- Socket.IO adapter on namespace `/combat`
- Swagger docs: `/api/docs`
- Port: 3001 (default)

## Server Modules

ConfigModule, ThrottlerModule (100 req/60s), DatabaseModule (TypeORM + PostgreSQL), RedisModule (ioredis, global), AuthModule, PlayerModule, CharacterModule, CombatModule (WebSocket gateway), LevelGenModule, LootModule, SkillTreeModule, EndgameModule, LeagueModule
