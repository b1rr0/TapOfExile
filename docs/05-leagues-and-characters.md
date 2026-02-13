# Лиги и Персонажи

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/league/league.service.ts` | Управление лигами, join/switch, auto-seeding |
| `server/src/league/league-migration.service.ts` | CRON миграция monthly→standard |
| `server/src/character/character.service.ts` | Создание и управление персонажами |
| `server/src/character/dto/create-character.dto.ts` | Валидация создания |
| `server/src/shared/entities/character.entity.ts` | Character entity |
| `server/src/shared/entities/player-league.entity.ts` | PlayerLeague join-таблица |
| `server/src/shared/entities/league.entity.ts` | League entity |
| `shared/class-stats.ts` | Дефинишны классов, statsAtLevel() |
| `bot/src/scenes/character-create-scene.ts` | FE: создание персонажа |
| `bot/src/scenes/character-select-scene.ts` | FE: выбор персонажа |

## Типы лиг

| Тип | Описание | endsAt |
|-----|----------|--------|
| Standard | Перманентная, всегда активна | null |
| Monthly | Временная, на 1 месяц | дата окончания |

Названия monthly лиг — японские месяцы: "Ichigatsu 2026", "Nigatsu 2026", "Sangatsu 2026" и т.д.

Auto-seeding: при старте сервера (`onModuleInit`) создаёт Standard и текущую Monthly лигу если не существуют.

## Статусы лиг

- `active` — текущая, можно играть
- `completed` — после миграции, нельзя играть
- `migrating` — в процессе переноса

## Ключевая связь: PlayerLeague

```
Player ←(1:N)→ PlayerLeague ←(N:1)→ League
                    ↓ (1:N)
               Character
               BagItem
```

### PlayerLeague entity:

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID | PK |
| playerTelegramId | bigint | FK → Player |
| leagueId | UUID | FK → League |
| gold | string (BigInt) | Золото в этой лиге |
| activeCharacterId | varchar | Активный персонаж в лиге |
| joinedAt | timestamp | Дата вступления |

**UNIQUE(playerTelegramId, leagueId)** — нельзя вступить дважды.

## Character Entity

| Категория | Поля |
|-----------|------|
| Identity | id, playerTelegramId, leagueId, playerLeagueId, nickname, classId, skinId |
| Base Stats | level, xp, xpToNext, hp, maxHp, tapDamage, critChance, critMultiplier, dodgeChance, specialValue |
| Elemental | elementalDamage (JSONB), resistance (JSONB) |
| Locations | completedLocations[], currentLocation, currentAct |
| Equipment | equipment (JSONB), allocatedNodes[] |
| Endgame | endgameUnlocked, completedBosses[], highestTierCompleted, totalMapsRun |
| Daily Bonus | dailyBonusWinsUsed, dailyBonusResetDate |

### Начальные значения при создании:

```
level=1, xp=0, xpToNext=100
hp/maxHp = CLASS_DEFS[classId].base.hp (100 для всех)
tapDamage = CLASS_DEFS[classId].base.tapDamage (2)
critChance = 0.05, critMultiplier = 1.5
dodgeChance = CLASS_DEFS[classId].base.dodgeChance (0.02-0.06)
specialValue = specialAtLevel(classId, 1)
elementalDamage = { physical: 1.0 }
resistance = CLASS_DEFS[classId].base.resistance
endgameUnlocked = false
dailyBonusWinsUsed = 0
```

### Классы и дефолтные скины:

| Class | Skin | Special | Description |
|-------|------|---------|-------------|
| samurai | samurai_1 | Lethal Precision | Bonus crit damage multiplier |
| warrior | knight_1 | Block | Chance to block attacks |
| mage | wizard_1 | Spell Amplify | Chance to amplify dmg 2.5x |
| archer | archer_1 | Double Shot | Chance to fire twice |

## Создание персонажа (character.service.ts)

1. Если передан `leagueId` → auto-join лиги, switch active league
2. Проверка лимита: max 10 персонажей на лигу
3. ID: `char_${timestamp}_${random}`
4. Инициализация стартовыми значениями из `CLASS_DEFS[classId]` через `statsAtLevel(classId, 1)`
5. Auto-activate если первый в лиге

### DTO валидация (create-character.dto.ts):

- nickname: `@MaxLength(64)`
- classId: `@IsIn(['samurai', 'warrior', 'mage', 'archer'])`
- leagueId: `@IsUUID()` (optional)

## Прогрессия персонажа

```
XP Level Scaling: scaledXp = baseXp / (1 + 0.4 * D^2), D = |playerLevel - monsterLevel|
xpToNext = XP_BASE * XP_GROWTH^(level-1) = 100 * 1.3^(level-1)
MAX_LEVEL = 60

При level up: пересчёт всех статов через statsAtLevel(classId, newLevel)
```

Daily bonus: первые 3 победы в день дают x3 XP. Reset в UTC 00:00.

## Миграция лиг (league-migration.service.ts)

**CRON**: `0 0 1 * *` — 00:00 UTC первого числа каждого месяца.

### Процесс:

```
1. Проверить: есть ли monthly лига с истёкшим endsAt
2. Для каждого игрока в monthly лиге:
   a. Найти/создать PlayerLeague в Standard
   b. Merge gold: standard.gold += monthly.gold
   c. Перенести персонажей: update leagueId → Standard
   d. Перенести bag items
   e. Удалить пустую monthly PlayerLeague
3. Переключить игроков на Standard если active = monthly
4. Пометить monthly лигу как "completed"
5. Создать лигу следующего месяца
```

Всё в TypeORM транзакции — rollback при ошибке.

## Скоупинг данных

| Данные | Скоуп |
|--------|-------|
| Gold | Per-league (PlayerLeague.gold) |
| Characters | Per-league (привязаны навсегда через leagueId) |
| Bag items | Per-league (shared между персонажами лиги) |
| Active character | Per-league (PlayerLeague.activeCharacterId) |
| Active league | Global per player (Player.activeLeagueId) |
| Meta stats | Global per player (Player.totalGold/kills/taps) |

## API Endpoints

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/leagues` | Нет | Все активные лиги |
| GET | `/leagues/my` | JWT | Лиги игрока |
| POST | `/leagues/:leagueId/join` | JWT | Вступить |
| POST | `/leagues/switch` | JWT | Переключить (body: `{leagueId}`) |
| GET | `/characters` | JWT | Персонажи активной лиги |
| POST | `/characters` | JWT | Создать |
| GET | `/characters/:id` | JWT | Получить персонажа |
| POST | `/characters/:id/activate` | JWT | Активировать |
| PUT | `/characters/:id/skin` | JWT | Сменить скин |
