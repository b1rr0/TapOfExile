# Награды после прохождения карты

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/combat/combat.service.ts` | `completeSession()` — начисление наград |
| `server/src/loot/loot.service.ts` | Роллинг дропов, управление сумкой |
| `shared/endgame-maps.ts` | `rollMapDrops()` — логика дропа ключей |
| `shared/balance.ts` | Константы баланса |
| `bot/src/game/state.ts` | `updateFromCombatComplete()` — обновление стейта |

## Процесс начисления наград (BE)

При вызове `POST /combat/complete` сервер выполняет `completeSession()`:

### 1. Gold → PlayerLeague (per-league pool)

```typescript
playerLeague.gold = String(BigInt(pl.gold) + BigInt(session.totalGoldEarned))
```

Gold хранится как BigInt строка для предотвращения переполнения.

### 2. XP → Character

```typescript
char.xp += session.totalXpEarned
// Level-up loop:
while (char.xp >= char.xpToNext) {
  char.xp -= char.xpToNext
  char.level++
  char.xpToNext = Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, char.level - 1))
}
```

- `XP_BASE = 100`, `XP_GROWTH = 1.3`

### 3. Meta Stats → Player (lifetime)

```typescript
player.totalGold  += session.totalGoldEarned
player.totalKills += session.monstersKilled
player.totalTaps  += session.totalTaps
```

### 4. Endgame Stats → Character

```typescript
char.totalMapsRun++
char.highestTierCompleted = Math.max(char.highestTierCompleted, mapTier)
// Для босс-карт: char.completedBosses.push(bossId)
```

### 5. Story Mode → CompletedLocations

Для сюжетного режима: `char.completedLocations.push(locationId)`

### 6. Loot Drops (только для endgame карт)

Вызывается `lootService.rollMapDrops(tier, isBossMap, direction)` — см. [07-loot-calculations.md](./07-loot-calculations.md).

Дропы добавляются в сумку (max 32 предмета).

## Ответ сервера на complete

```typescript
{
  totalGold: number,
  totalXp: number,
  totalTaps: number,
  monstersKilled: number,
  level?: number,       // обновлённый уровень
  xp?: number,          // текущий xp
  xpToNext?: number,    // до следующего уровня
  gold?: number,        // текущий gold
  mapDrops?: BagItem[], // дропнутые ключи (только endgame)
  locationId?: string,  // для story mode
}
```

## FE обработка наград (state.ts)

`updateFromCombatComplete(result)`:

1. Обновляет `playerLeague.gold`
2. Обновляет `character.level`, `xp`, `xpToNext`
3. Добавляет `completedLocations`
4. Добавляет `mapDrops` в `bag`
5. Emits: `goldChanged`, `xpChanged`, `levelUp`

## Victory Scene

Отображает:
- Заработанное золото и XP (форматированные числа)
- Баннер завершения акта (если акт пройден)
- Список дропнутых ключей с CSS-классами по качеству
- Пустое состояние если дропов нет

## Распределение данных

| Данные | Куда | Скоуп |
|--------|------|-------|
| Gold | PlayerLeague.gold | Per-league |
| XP | Character.xp/level | Per-character |
| Bag items | BagItem → PlayerLeague | Per-league (общая сумка) |
| Meta stats | Player.totalGold/kills/taps | Global (lifetime) |
| Locations | Character.completedLocations | Per-character |
| Endgame | Character.totalMapsRun etc. | Per-character |
