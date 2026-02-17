# Противодействие читам

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/combat/combat.gateway.ts` | WebSocket gateway, rate limit check, ban enforcement |
| `server/src/combat/combat.service.ts` | Server-authoritative боёвка, `checkMessageRate()`, `banPlayer()`, `isPlayerBanned()` |
| `server/src/auth/auth.service.ts` | Telegram HMAC-SHA256 валидация, ban check на логине |
| `server/src/player/player.service.ts` | Ban check в `getPlayerState()` |
| `server/src/auth/strategies/jwt.strategy.ts` | JWT стратегия |
| `server/src/auth/auth.guard.ts` | JwtAuthGuard |
| `server/src/skill-tree/skill-tree.service.ts` | Валидация дерева |
| `shared/skill-tree-validation.ts` | Shared BFS + budget валидация |
| `shared/balance.ts` | `ANTICHEAT_*` константы |
| `server/src/main.ts` | Global ValidationPipe |
| `server/src/app.module.ts` | ThrottlerModule |
| `bot/src/game/state.ts` | `BannedError` class, ban check при загрузке |
| `bot/src/main.ts` | `showBanScreen()` — полноэкранный бан |
| `bot/src/scenes/dojo-scene.ts` | Ban overlay в додзё |
| `bot/src/scenes/combat-scene.ts` | Ban overlay в бою |

---

## Уровни защиты

### 1. Server-Authoritative Combat

**Все расчёты боя на сервере.** Клиент — только display layer.

- Урон считается на BE: `cachedStats.tapDamage` + `critChance` → из Redis-кеша (при старте сессии), не от клиента
- HP монстров хранятся в Redis сессии
- Клиент не может подделать урон или убить монстра
- Completion проверяет что все монстры убиты
- Вражеские атаки генерируются сервером каждые 200ms (combat loop)
- Elemental damage (physical/fire/lightning/cold/pure) рассчитывается на сервере

```typescript
// combat.service.ts - processTap()
const stats = session.cachedStats;         // закешированы при старте, не от клиента
const isCrit = Math.random() < stats.critChance;  // серверный RNG
let damage = stats.tapDamage;
if (isCrit) damage = Math.floor(damage * stats.critMultiplier);
// + elemental damage calculation
monster.currentHp -= totalDamage;          // серверный HP
```

### 2. Universal Socket Rate Limiter

**Единый rate limiter на ВСЕ WebSocket сообщения.** Заменил старый per-tap `checkTapRate`.

| Параметр | Значение | Константа |
|----------|----------|-----------|
| Окно | 3 секунды | `B.ANTICHEAT_WINDOW_MS` |
| Лимит | 30 сообщений / окно | `B.ANTICHEAT_MSG_LIMIT` |
| Наказание | Мгновенный бан 24ч | `B.ANTICHEAT_BAN_DURATION_MS` |

```typescript
// combat.service.ts
async checkMessageRate(telegramId: string): Promise<boolean> {
  const windowIndex = Math.floor(Date.now() / B.ANTICHEAT_WINDOW_MS);
  const key = `anticheat:msgs:${telegramId}:${windowIndex}`;  // TTL 10s
  const count = await this.redis.incr(key);
  if (count === 1) await this.redis.expire(key, 10);
  if (count <= B.ANTICHEAT_MSG_LIMIT) return false; // OK
  await this.banPlayer(telegramId, 'rate_limit_exceeded');
  return true; // BANNED
}
```

Вызывается в **каждом** WebSocket handler через `rateLimitCheck()`:

```
handleStartLocation  handleStartMap     handleStartDojo
handleTap            handleCompleteDojo handleComplete
handleFlee           handleEntranceDone handleReconnect
handleUsePotion      handleCastSkill
```

Дополнительно: HTTP throttling через NestJS ThrottlerModule:

| Уровень | Настройка | Где |
|---------|-----------|-----|
| Global | 100 req / 60 сек | `app.module.ts` ThrottlerModule |
| Auth | 5 req / 60 сек | `auth.controller.ts` @Throttle |

### 3. Система банов

#### Trigger

Единственный автоматический триггер: `rate_limit_exceeded` — превышение 30 socket-сообщений в 3-секундном окне.

#### Dual Storage (Redis + PostgreSQL)

Бан хранится в **двух местах** одновременно:

| Хранилище | Ключ / Поле | TTL | Назначение |
|-----------|-------------|-----|------------|
| **Redis** | `anticheat:ban:{telegramId}` | 24ч (auto-expire) | Fast path — проверка за ~1ms |
| **PostgreSQL** | `Player.bannedUntil` + `Player.banReason` | нет (persistent) | Durability — переживает Redis flush |

```typescript
// combat.service.ts - banPlayer()
private async banPlayer(telegramId: string, reason: string): Promise<void> {
  const expiresAt = Date.now() + B.ANTICHEAT_BAN_DURATION_MS;

  // 1. Redis — fast check (auto-expires)
  await this.redis.setJson(`anticheat:ban:${telegramId}`, {
    reason, bannedAt: Date.now(), expiresAt
  }, Math.ceil(B.ANTICHEAT_BAN_DURATION_MS / 1000));

  // 2. PostgreSQL — persistent
  await this.playerRepo.update(telegramId, {
    bannedUntil: new Date(expiresAt),
    banReason: reason,
  });
}
```

#### Ban Check с fallback

```typescript
// combat.service.ts - isPlayerBanned()
async isPlayerBanned(telegramId): Promise<{ banned: boolean; expiresAt?: number }> {
  // 1. Fast path: Redis
  const banData = await this.redis.getJson(`anticheat:ban:${telegramId}`);
  if (banData?.expiresAt > Date.now()) return { banned: true, expiresAt: banData.expiresAt };

  // 2. Fallback: DB (если Redis был очищен)
  const player = await this.playerRepo.findOne({ where: { telegramId } });
  if (player?.bannedUntil?.getTime() > Date.now()) {
    // Re-cache в Redis для следующих проверок
    await this.redis.setJson(`anticheat:ban:${telegramId}`, { ... }, remainingTtl);
    return { banned: true, expiresAt: player.bannedUntil.getTime() };
  }

  return { banned: false };
}
```

#### 5 точек проверки бана (Enforcement Points)

| # | Где | Файл | Что происходит |
|---|-----|------|----------------|
| 1 | **Логин** | `auth.service.ts` → `authenticateTelegram()` | Возвращает `banned: true` + `bannedUntil` в ответе |
| 2 | **Загрузка состояния** | `player.service.ts` → `getPlayerState()` | Возвращает только ban info, без тяжёлых данных |
| 3 | **WS подключение** | `combat.gateway.ts` → `handleConnection()` | `emit('combat:banned')` + `disconnect()` |
| 4 | **Каждое WS сообщение** | `combat.gateway.ts` → `rateLimitCheck()` | Cleanup сессии + `emit('combat:banned')` |
| 5 | **В бою (ивент)** | `combat.gateway.ts` | `combat:banned` event клиенту |

#### Клиентская обработка

**При запуске игры** (`state.ts` + `main.ts`):

```typescript
// state.ts - BannedError
export class BannedError extends Error {
  bannedUntil: number;
  banReason: string;
}

// state.ts - load()
const authResult = await api.auth.login(initData);
if (authResult.player.banned) {
  throw new BannedError(authResult.player.bannedUntil, authResult.player.banReason);
}

// main.ts - bootstrap
catch (err) {
  if (err instanceof BannedError) {
    showBanScreen(err.bannedUntil, err.banReason); // полноэкранный бан
    return; // игра не запускается
  }
}
```

**Во время боя** (`combat-scene.ts`):

```
combat:banned event → ban overlay (полупрозрачный)
  → показывает время окончания бана
  → кнопка "Return to Hideout"
```

**Во время додзё** (`dojo-scene.ts`):

```
combat:banned event → ban overlay
  → показывает оставшиеся часы
  → кнопка "Return to Hideout"
```

#### Ручной разбан

Нужно чистить **оба** хранилища:

```sql
-- PostgreSQL
UPDATE player SET "bannedUntil" = NULL, "banReason" = NULL WHERE "telegramId" = '123456';
```

```bash
# Redis
docker exec 33metro-redis-1 redis-cli DEL anticheat:ban:123456
```

Если очистить только БД — Redis cache всё ещё забанит (до истечения TTL).
Если очистить только Redis — DB fallback заново создаст Redis-запись.

### 4. Server-Authoritative Dojo

Додзё (тренировочный манекен) полностью на сервере через WebSocket.

**Socket Events:**

| Direction | Event | Payload |
|-----------|-------|---------|
| C→S | `combat:start-dojo` | `{}` |
| S→C | `combat:dojo-started` | `{ sessionId, dojoEndsAt }` |
| C→S | `combat:tap` | `{ sessionId }` |
| S→C | `combat:tap-result` | `{ damage, isCrit, totalDamage, totalTaps, dojoEnded, timeLeftMs }` |
| C→S | `combat:complete-dojo` | `{ sessionId }` |
| S→C | `combat:dojo-completed` | `{ totalDamage, totalTaps, dps, bestDamage, isNewBest }` |

**Защита:**
- Серверный таймер: `dojoEndsAt = now + DOJO_COUNTDOWN_MS + DOJO_ROUND_MS`
- Auto-complete на сервере: `setTimeout(completeDojo, COUNTDOWN + ROUND + 500ms)` — нельзя играть дольше
- Урон = серверный `tapDamage × critMultiplier` по закешированным статам
- Anti-double-fire guard: `if (this._phase === "results") return`
- Rate limiter работает и в додзё (те же 30 msgs / 3 sec)
- Клиентский 100ms rate limit — только для UX (debounce), не для безопасности

### 5. Telegram Signature Verification

HMAC-SHA256 проверка initData — невозможно подделать аутентификацию без BOT_TOKEN.

```
secretKey = HMAC-SHA256('WebAppData', BOT_TOKEN)
checkHash = HMAC-SHA256(secretKey, dataCheckString)
// + проверка auth_date не старше 24 часов
```

### 6. JWT Security

- Separate access / refresh tokens
- Access: 1 час (short-lived)
- Refresh: 30 дней (Redis stored, verifiable)
- Token type validation: `payload.type === 'access'` (refresh токен не пройдёт как access)
- WebSocket: JWT верифицируется при подключении (`client.handshake.auth.token`)
- Невалидный токен → disconnect
- Mapping: socketId <-> telegramId (один сокет на пользователя)

### 7. Input Validation (DTO + Global Pipe)

```typescript
// main.ts - global pipe
new ValidationPipe({
  whitelist: true,             // strip unknown properties
  forbidNonWhitelisted: true,  // reject unknown fields
  transform: true,             // auto-transform types
})
```

DTO-level: `@IsString()`, `@IsNotEmpty()`, `@IsArray()`, `@IsNumber()`, `@MaxLength()`, `@IsIn()`, `@IsUUID()`

### 8. Session Ownership

```typescript
// Каждый combat action проверяет ownership:
if (session.playerId !== telegramId) {
  throw new NotFoundException(); // нельзя тапать в чужую сессию
}
```

Sessions в Redis с TTL 30 мин (combat) / 60 сек (dojo) — нельзя использовать повторно.

### 9. Skill Tree Validation

Shared validator (`skill-tree-validation.ts`):

1. Start node allocated
2. All IDs valid (integers, in range)
3. BFS connectivity — все ноды связаны со стартовой
4. Budget: outer <= level-1, classSkills <= 6

```typescript
// BE дополнительно:
// Type check: каждый элемент - non-negative integer
// Deduplication: [...new Set(allocated)]
```

### 10. Player Ownership на всех запросах

Все DB запросы содержат `playerTelegramId = telegramId`:

```typescript
charRepo.findOne({ where: { id: characterId, playerTelegramId: telegramId } })
```

Невозможно получить доступ к данным другого игрока.

### 11. Audit Trail

`CombatSession` entity сохраняется в PostgreSQL:
- totalMonsters, monstersKilled, totalGoldEarned, totalXpEarned
- totalTaps, timestamp, status (active/completed/abandoned/flagged)

Позволяет post-game анализ на аномалии.

### 12. Anti-AFK в бою

`MAX_PENDING_ATTACKS = 10` — максимум 10 атак монстра за один тик.
Не позволяет накопить бесконечный timeBank.

### 13. Disconnect Grace Period

30 секунд grace period при дисконнекте.
После 30с — автоматический flee (бой потерян, без наград).
При reconnect: `lastEnemyAttackTime = now` — "прощение" пропущенных атак.
В додзё: disconnect → completeDojo() (score сохраняется).

---

## Redis ключи античита

| Ключ | Назначение | TTL |
|------|------------|-----|
| `anticheat:msgs:{telegramId}:{windowIndex}` | Счётчик сообщений в 3-сек окне | 10 сек |
| `anticheat:ban:{telegramId}` | JSON: `{ reason, bannedAt, expiresAt }` | 24 часа |
| `combat:session:{uuid}` | Боевая сессия (включая dojo) | 30 мин / 60 сек |

---

## Константы (shared/balance.ts)

```typescript
ANTICHEAT_WINDOW_MS:        3_000,       // 3-сек окно для подсчёта
ANTICHEAT_MSG_LIMIT:        30,          // макс сообщений за окно
ANTICHEAT_BAN_DURATION_MS:  86_400_000,  // 24 часа бан
DOJO_COUNTDOWN_MS:          3_000,       // 3-сек обратный отсчёт
DOJO_ROUND_MS:              10_000,      // 10-сек бой
DOJO_SESSION_TTL:           60,          // Redis TTL (1 мин)
```

---

## Возможные доработки (чего пока нет)

- Server-side timing анализ (среднее время между тапами за сессию → автобан при подозрительных паттернах)
- Anomaly detection (слишком быстрое прохождение карт, нереалистичный DPS)
- IP-based rate limiting (только per-user throttle сейчас)
- Device fingerprinting
- Прогрессивные баны (1-й раз 24ч, 2-й раз 7д, 3-й — перманент)
- Admin panel для просмотра банов и ручного управления
