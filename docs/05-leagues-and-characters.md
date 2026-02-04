# Лиги и Персонажи

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/league/league.service.ts` | Управление лигами, join/switch |
| `server/src/league/league-migration.service.ts` | CRON миграция monthly→standard |
| `server/src/character/character.service.ts` | Создание и управление персонажами |
| `server/src/character/dto/create-character.dto.ts` | Валидация создания |
| `server/src/shared/entities/character.entity.ts` | Character entity |
| `server/src/shared/entities/player-league.entity.ts` | PlayerLeague join-таблица |
| `bot/src/scenes/character-create-scene.ts` | FE: создание персонажа |
| `bot/src/scenes/character-select-scene.ts` | FE: выбор персонажа |
| `bot/src/types.ts` | FE типы |

## Типы лиг

| Тип | Описание | endsAt |
|-----|----------|--------|
| Standard | Перманентная, всегда активна | null |
| Monthly | Временная, на 1 месяц | дата окончания |

Названия monthly лиг — японские месяцы: "Sangatsu 2026" (Март 2026).

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
| Stats | level, xp, xpToNext, tapDamage, critChance, critMultiplier, passiveDps |
| Combat | combatCurrentStage, combatCurrentWave, combatWavesPerStage |
| Locations | completedLocations[], currentLocation, currentAct |
| Equipment | equipment (JSONB), allocatedNodes[] |
| Endgame | endgameUnlocked, completedBosses[], highestTierCompleted, totalMapsRun |

### Начальные значения:

```
level=1, xp=0, xpToNext=100
tapDamage=1, critChance=0.05, critMultiplier=2.0, passiveDps=0
currentAct=1, endgameUnlocked=false
```

### Классы и дефолтные скины:

```
samurai → samurai_1
warrior → knight_1
mage    → wizard_1
archer  → archer_1
```

## Создание персонажа (character.service.ts)

1. Если передан `leagueId` → auto-join лиги, switch active league
2. Проверка лимита: max 10 персонажей на лигу
3. ID: `char_${timestamp}_${random}`
4. Инициализация стартовыми значениями из `B.STARTING_STATS`
5. Auto-activate если первый в лиге

### DTO валидация (create-character.dto.ts):

- nickname: `@MaxLength(64)`
- classId: `@IsIn(['samurai', 'warrior', 'mage', 'archer'])`
- leagueId: `@IsUUID()` (optional)

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
| Bag items | Per-league (shared между персонажами) |
| Active character | Per-league (PlayerLeague.activeCharacterId) |
| Active league | Global per player (Player.activeLeagueId) |
| Meta stats | Global per player (Player.totalGold/kills/taps) |

## API Endpoints

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/leagues` | Нет | Все активные лиги |
| GET | `/leagues/my` | JWT | Лиги игрока |
| GET | `/leagues/active` | JWT | Текущая активная лига |
| POST | `/leagues/:leagueId/join` | JWT | Вступить |
| POST | `/leagues/switch` | JWT | Переключить (body: `{leagueId}`) |
| GET | `/leagues/:leagueId/leaderboard` | Нет | Топ-50 по золоту |
| GET | `/characters` | JWT | Персонажи активной лиги |
| POST | `/characters` | JWT | Создать |
| POST | `/characters/:id/activate` | JWT | Активировать |
| PUT | `/characters/:id/skin` | JWT | Сменить скин |
