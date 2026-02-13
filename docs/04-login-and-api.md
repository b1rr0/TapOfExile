# Логин и API запросы

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `bot/src/api.ts` | FE API клиент, token management, auto-refresh |
| `bot/src/combat-socket.ts` | Socket.IO клиент (singleton, namespace `/combat`) |
| `bot/src/main.ts` | Инициализация приложения |
| `bot/src/game/state.ts` | GameState.load() — flow логина |
| `server/src/auth/auth.service.ts` | Telegram валидация, JWT выдача |
| `server/src/auth/auth.controller.ts` | `/auth/*` эндпоинты |
| `server/src/auth/auth.guard.ts` | JwtAuthGuard |
| `server/src/auth/strategies/jwt.strategy.ts` | Passport JWT стратегия |
| `server/src/shared/decorators/current-user.decorator.ts` | @CurrentUser |
| `server/src/main.ts` | Сервер: CORS, ValidationPipe, Swagger |

## Flow аутентификации

```
1. FE: window.Telegram.WebApp.initData → base64-encoded Telegram data
2. FE: api.auth.login(initData)        → POST /api/auth/telegram
3. BE: validateTelegramInitData()      → HMAC-SHA256 проверка подписи
4. BE: findOrCreatePlayer()            → Создаёт Player если нет
5. BE: issueTokens()                   → JWT access + refresh
6. FE: хранит токены в closure         → НЕ в localStorage (ephemeral)
7. FE: state.load()                    → Загружает полный стейт
```

## Telegram Signature Validation (auth.service.ts)

```
1. Parse initData как URLSearchParams
2. Extract 'hash', убрать из params
3. Sort оставшиеся params по алфавиту
4. Build dataCheckString: "key=value\nkey=value\n..."
5. secretKey = HMAC-SHA256('WebAppData', BOT_TOKEN)
6. checkHash = HMAC-SHA256(secretKey, dataCheckString).hex()
7. Compare checkHash === hash
8. Проверка auth_date: не старше 24 часов (86400 сек)
```

## JWT Tokens

| Token | Expiry | Хранение |
|-------|--------|----------|
| Access | 1 час (JWT_ACCESS_EXPIRY) | FE: closure variable (in-memory) |
| Refresh | 30 дней (JWT_REFRESH_EXPIRY) | BE: Redis `auth:refresh:${telegramId}` |

**Payload**: `{ sub: telegramId, type: 'access' | 'refresh' }`

Токены **никогда** не сохраняются в localStorage/sessionStorage — теряются при перезагрузке.

## Token Refresh (api.ts)

При получении 401:
1. Вызвать `POST /api/auth/refresh` с `{ refreshToken }`
2. Получить новый `accessToken`
3. Повторить оригинальный запрос с новым токеном

## API Client (bot/src/api.ts)

Base URL: `import.meta.env.VITE_API_URL` или `/api`

Все запросы: `Authorization: Bearer ${accessToken}`

### Модули REST API

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

Подключение: `bot/src/combat-socket.ts` → singleton socket.

```
getAccessToken()           → Используется для auth: { token } при подключении

Клиент → Сервер:
  combat:start-location    → { locationId, waves, order, act }
  combat:start-map         → { mapKeyItemId, direction? }
  combat:tap               → { sessionId }
  combat:entrance-done     → { sessionId }
  combat:complete          → { sessionId }
  combat:flee              → { sessionId }
  combat:reconnect         → { sessionId }

Сервер → Клиент:
  combat:started           → { sessionId, totalMonsters, currentMonster, playerHp, playerMaxHp }
  combat:tap-result        → { damage, isCrit, monsterHp, killed, isComplete, playerHp, ... }
  combat:enemy-attack      → { attacks[], playerHp, playerMaxHp, playerDead }
  combat:completed         → { totalGold, totalXp, level, mapDrops, ... }
  combat:player-died       → { sessionId }
  combat:fled              → { success }
  combat:reconnected       → { sessionId, currentMonster, playerHp, ... }
  combat:error             → { message }
```

## Инициализация FE (main.ts → state.ts)

```
1. api.auth.login(initData) — аутентификация
2. api.leagues.list()       — список лиг
3. Auto-join Standard league если нет activeLeagueId
4. api.player.getState()    — полный стейт (characters, gold, bag, meta)
5. Маршрутизация в нужную сцену:
   - Нет персонажей → CharacterCreateScene
   - Нет активного персонажа → CharacterSelectScene
   - Есть активный → HideoutScene
```

## Backend Infrastructure (server/src/main.ts)

- NestJS v10, prefix `/api`
- CORS: enabled, credentials: true
- Global ValidationPipe: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
- Socket.IO adapter на namespace `/combat`
- Swagger docs: `/api/docs`
- Port: 3001 (по умолчанию)

## Модули сервера

ConfigModule, ThrottlerModule (100 req/60s), DatabaseModule (TypeORM + PostgreSQL), RedisModule (ioredis, global), AuthModule, PlayerModule, CharacterModule, CombatModule (WebSocket gateway), LevelGenModule, LootModule, SkillTreeModule, EndgameModule, LeagueModule
