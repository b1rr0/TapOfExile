# Логин и API запросы

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `bot/src/api.ts` | FE API клиент, token management, auto-refresh |
| `bot/src/main.ts` | Инициализация приложения |
| `bot/src/game/state.ts` | GameState.load() — flow логина |
| `server/src/auth/auth.service.ts` | Telegram валидация, JWT выдача |
| `server/src/auth/auth.controller.ts` | `/auth/*` эндпоинты |
| `server/src/auth/auth.guard.ts` | JwtAuthGuard |
| `server/src/auth/strategies/jwt.strategy.ts` | Passport JWT стратегия |
| `server/src/shared/decorators/current-user.decorator.ts` | @CurrentUser |
| `server/src/main.ts` | Сервер: CORS, ValidationPipe, prefix "/api" |

## Flow аутентификации

```
1. FE: window.Telegram.WebApp.initData → base64-encoded Telegram data
2. FE: api.auth.login(initData)        → POST /auth/telegram
3. BE: validateTelegramInitData()      → HMAC-SHA256 проверка подписи
4. BE: findOrCreatePlayer()            → Создаёт Player если нет
5. BE: issueTokens()                   → JWT access + refresh
6. FE: хранит токены в closure         → НЕ в localStorage
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
| Access | 1 час (JWT_ACCESS_EXPIRY) | FE: closure variable |
| Refresh | 30 дней (JWT_REFRESH_EXPIRY) | BE: Redis `auth:refresh:${telegramId}` |

**Payload**: `{ sub: telegramId, type: 'access' | 'refresh' }`

## Token Refresh (api.ts)

При получении 401:
1. Вызвать `POST /auth/refresh` с `{ refreshToken }`
2. Получить новый `accessToken`
3. Повторить оригинальный запрос

## API Client (bot/src/api.ts)

Base URL: `import.meta.env.VITE_API_URL` или `/api`

Все запросы: `Authorization: Bearer ${accessToken}`

### Модули API

```
api.auth
  .login(initData)         → POST /auth/telegram
  .refresh()               → POST /auth/refresh
  .isAuthenticated()       → boolean

api.player
  .getState()              → GET /player
  .claimOfflineGold()      → POST /player/claim-offline

api.characters
  .list()                  → GET /characters
  .create(nickname, classId, leagueId?) → POST /characters
  .get(id)                 → GET /characters/:id
  .activate(id)            → POST /characters/:id/activate
  .changeSkin(id, skinId)  → PUT /characters/:id/skin

api.combat
  .startLocation(locationId, waves, order, act) → POST /combat/start-location
  .startMap(mapKeyItemId, direction?)            → POST /combat/start-map
  .tap(sessionId)          → POST /combat/tap
  .complete(sessionId)     → POST /combat/complete
  .flee(sessionId)         → POST /combat/flee

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

## Инициализация FE (state.ts → load())

```
1. api.auth.login(initData) — аутентификация
2. api.leagues.list()       — список лиг
3. Auto-join Standard league если нет activeLeagueId
4. api.player.getState()    — полный стейт (refreshState)
5. Проверка offline gold, показ popup
6. Маршрутизация в нужную сцену
```

## Backend Infrastructure (server/src/main.ts)

- NestJS, prefix `/api`
- CORS: enabled, credentials: true
- Global ValidationPipe: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`
- Swagger docs: `/api/docs`
- Port: 3000 (default)

## Модули сервера

ConfigModule, ThrottlerModule, DatabaseModule (TypeORM + PostgreSQL), RedisModule, AuthModule, PlayerModule, CharacterModule, CombatModule, LevelGenModule, LootModule, SkillTreeModule, EndgameModule, LeagueModule
