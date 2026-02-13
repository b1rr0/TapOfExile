# Противодействие читам

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/combat/combat.gateway.ts` | WebSocket gateway, session management |
| `server/src/combat/combat.service.ts` | Server-authoritative боёвка, rate limit |
| `server/src/auth/auth.service.ts` | Telegram HMAC-SHA256 валидация |
| `server/src/auth/strategies/jwt.strategy.ts` | JWT стратегия |
| `server/src/auth/auth.guard.ts` | JwtAuthGuard |
| `server/src/skill-tree/skill-tree.service.ts` | Валидация дерева |
| `shared/skill-tree-validation.ts` | Shared BFS + budget валидация |
| `server/src/main.ts` | Global ValidationPipe |
| `server/src/app.module.ts` | ThrottlerModule |

## Уровни защиты

### 1. Server-Authoritative Combat

**Все расчёты боя на сервере.** Клиент — только display layer.

- Урон считается на BE: `char.tapDamage` + `critChance` → из БД, не от клиента
- HP монстров хранятся в Redis сессии
- Клиент не может подделать урон или убить монстра
- Completion проверяет что все монстры убиты
- Вражеские атаки генерируются сервером каждые 200ms (combat loop)

```typescript
// combat.service.ts - processTap()
const char = await charRepo.findOne(session.characterId) // из БД, не от клиента
const isCrit = Math.random() < char.critChance           // серверный RNG
let damage = char.tapDamage
if (isCrit) damage = Math.floor(damage * char.critMultiplier)
monster.currentHp -= damage                               // серверный HP
```

### 2. Rate Limiting (3 уровня)

| Уровень | Настройка | Где |
|---------|-----------|-----|
| Global | 100 req/60 сек | `app.module.ts` ThrottlerModule |
| Auth | 5 req/60 сек | `auth.controller.ts` @Throttle |
| Tap | min 50ms между тапами | `combat.service.ts` MIN_TAP_INTERVAL_MS |

### 3. Hard Tap Interval

```typescript
const MIN_TAP_INTERVAL_MS = 50; // 20 тапов/сек макс

if (now - session.lastTapTime < MIN_TAP_INTERVAL_MS) {
  throw new BadRequestException('Tap too fast');
}
```

### 4. Telegram Signature Verification

HMAC-SHA256 проверка initData — невозможно подделать аутентификацию без BOT_TOKEN.

```
secretKey = HMAC-SHA256('WebAppData', BOT_TOKEN)
checkHash = HMAC-SHA256(secretKey, dataCheckString)
// + проверка auth_date не старше 24 часов
```

### 5. JWT Security

- Separate access/refresh tokens
- Access: 1 час (short-lived)
- Refresh: 30 дней (Redis stored, verifiable)
- Token type validation: `payload.type === 'access'` (refresh токен не пройдёт как access)

### 6. Input Validation (DTO + Global Pipe)

```typescript
// main.ts - global pipe
new ValidationPipe({
  whitelist: true,             // strip unknown properties
  forbidNonWhitelisted: true,  // reject unknown fields
  transform: true,             // auto-transform types
})
```

DTO-level: `@IsString()`, `@IsNotEmpty()`, `@IsArray()`, `@IsNumber()`, `@MaxLength()`, `@IsIn()`, `@IsUUID()`

### 7. Session Ownership

```typescript
// Каждый combat action проверяет ownership:
if (session.playerId !== telegramId) {
  throw new NotFoundException(); // нельзя тапать в чужую сессию
}
```

Sessions в Redis с TTL 30 мин — нельзя использовать повторно.

### 8. Skill Tree Validation

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

### 9. Player Ownership на всех запросах

Все DB запросы содержат `playerTelegramId = telegramId`:

```typescript
charRepo.findOne({ where: { id: characterId, playerTelegramId: telegramId } })
```

Невозможно получить доступ к данным другого игрока.

### 10. WebSocket Auth

JWT верифицируется при подключении к Socket.IO:
- Токен из `client.handshake.auth.token` или `Authorization` header
- Невалидный токен → disconnect
- Mapping: socketId ↔ telegramId (один сокет на пользователя)

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

## Возможные доработки (чего пока нет)

- Нет server-side timing анализа (среднее время между тапами за сессию)
- Нет anomaly detection (слишком быстрое прохождение карт)
- Нет IP-based rate limiting (только per-user throttle)
- Нет device fingerprinting
- Нет шифрования payload запросов (только HTTPS)
