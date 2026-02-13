# Система наград

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/combat/combat.service.ts` | `processTap()` — XP за килл; `completeSession()` — gold + loot |
| `server/src/combat/combat.gateway.ts` | WebSocket gateway |
| `server/src/loot/loot.service.ts` | Роллинг дропов, управление сумкой |
| `shared/endgame-maps.ts` | `rollMapDrops()` — логика дропа ключей |
| `shared/balance.ts` | Константы баланса |
| `bot/src/game/state.ts` | Обновление клиентского стейта |

---

## Когда что начисляется

| Награда | Момент | Потеря при смерти |
|---------|--------|-------------------|
| **XP** | За каждого убитого монстра (сразу) | XP Loss по формуле (lvl 40+) |
| **Gold** | Только при полном прохождении | Всё потеряно |
| **Loot** | Только при полном прохождении | Весь потерян |

**Ключевой принцип**: XP — награда за прогресс в бою (каждый килл). Gold и loot — награда за завершение (всё или ничего).

---

## 1. XP → за каждого убитого монстра

Начисляется в `processTap()` в момент `monster.currentHp <= 0`.

### XP Level Scaling
```
scaledXp = baseXp / (1 + XP_LEVEL_SCALING_A * D²)
D = |playerLevel - monsterLevel|, A = 0.4
```

Монстр одного уровня с игроком → полный XP. Разница ±5 уровней → XP сильно падает.

### Daily Bonus (первые 3 килла/день)
```
if dailyBonusKillsUsed < 3:
  xp *= 3  (тройной XP)
  dailyBonusKillsUsed++
```
Сброс в UTC 00:00 (по `dailyBonusResetDate` как YYYY-MM-DD).

### Level Up (мгновенный, в момент килла)
```typescript
xpToNext = Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, char.level - 1))
// = Math.floor(100 * 1.3^(level-1))

while (char.xp >= char.xpToNext) {
  char.xp -= char.xpToNext
  char.level++
  // Пересчёт всех статов через statsAtLevel(classId, level)
}
```
MAX_LEVEL = 60.

### Ответ сервера (в tap-result при killed=true)
```typescript
{
  // ... стандартные поля tap-result ...
  killed: true,
  xpGained,              // сколько XP получено за этого монстра
  level, xp, xpToNext,   // актуальные значения после начисления
  leveledUp,             // true если произошёл level up
}
```

### Клиент (при killed=true)
1. Показать `+{xpGained} XP` флоатер над монстром
2. Если `leveledUp` — анимация level up
3. Обновить XP-бар в UI

---

## 2. Gold + Loot → только при полном прохождении

Начисляется в `completeSession()` при `combat:complete`.

### Gold → PlayerLeague
```typescript
playerLeague.gold = String(BigInt(pl.gold) + BigInt(session.totalGoldEarned))
```
Gold хранится как BigInt строка. Золото копится в Redis-сессии за каждого убитого монстра, но записывается в БД **только при полном прохождении**.

### Loot Drops → BagItem (endgame only)
Вызывается `lootService.rollMapDrops(tier, isBossMap, direction)` — см. [07-loot-calculations.md](./07-loot-calculations.md).
Дропы добавляются в сумку (max 32 предмета на лигу).

### Location Completion → Character (story mode)
```typescript
if (mode === 'location' && !completedLocations.includes(locationId)):
  character.completedLocations.push(locationId)
```

### Endgame Stats → Character
```typescript
character.totalMapsRun++
character.highestTierCompleted = Math.max(current, mapTier)
// Для босс-карт: character.completedBosses.push(bossId) (deduplicated)
```

### Meta Stats → Player (lifetime)
```typescript
player.totalGold  += session.totalGoldEarned   // bigint
player.totalKills += session.monstersKilled     // bigint
player.totalTaps  += session.totalTaps          // bigint
```

### Audit Record → CombatSession (PostgreSQL)
```typescript
CombatSession {
  status: 'completed', completedAt: now(),
  monstersKilled, totalGoldEarned, totalXpEarned, totalTaps
}
```

### Cleanup → Redis
`DELETE combat:session:{sessionId}`

### Ответ сервера (combat:completed)
```typescript
{
  totalGold, totalXp,
  totalTaps, monstersKilled,
  level, xp, xpToNext, gold,
  mapDrops: BagItem[],
  locationId?,
  dailyBonusUsed, dailyBonusRemaining,
}
```

---

## Victory Scene (FE)

Отображает:
- Заработанное золото (форматированное число)
- Суммарный XP за весь бой
- Level up индикатор (если был за время боя)
- Список дропнутых ключей с CSS-классами по качеству
- Оставшиеся daily bonus
- Кнопка "Return to Hideout" → HideoutScene

---

## Смерть игрока

Если HP <= 0 (через `combat:player-died` или `tap-result.playerDead`):
1. Combat loop останавливается
2. Redis сессия удаляется
3. **Gold потерян** — золото из сессии не записывается в БД
4. **Loot потерян** — дропы не ролятся
5. **XP сохранён** — весь XP за убитых монстров уже начислен (при каждом килле)
6. **XP Loss** — штраф опыта при смерти (см. формулу ниже)
7. FE: DeathScene с "Respawn" → полный HP reset → HideoutScene

### XP Loss при смерти

Кубическая кривая: штраф растёт от 0% до 50% в диапазоне уровней 40–56.

```
          ⎧ 0,                            L ≤ 40
Loss(L) = ⎨ 50 × ((L - 40) / 16)^3,      41 ≤ L ≤ 56
          ⎩ 50,                            L ≥ 57
```

Формула в коде:
```typescript
function xpLossPercent(level: number): number {
  if (level <= 40) return 0;
  if (level >= 57) return 50;
  return 50 * Math.pow((level - 40) / 16, 3);
}

// Применение при смерти:
const lostXp = Math.floor(char.xp * xpLossPercent(char.level) / 100);
char.xp = Math.max(0, char.xp - lostXp);
// XP loss НЕ снижает уровень — только текущий прогресс к следующему
```

**Таблица значений:**

| Уровень | Потеря XP |
|---------|-----------|
| ≤ 40    | 0%        |
| 41      | 0.01%     |
| 42      | 0.10%     |
| 43      | 0.34%     |
| 44      | 0.78%     |
| 45      | 1.56%     |
| 46      | 2.74%     |
| 47      | 4.39%     |
| 48      | 6.59%     |
| 49      | 9.43%     |
| 50      | 13.02%    |
| 51      | 17.46%    |
| 52      | 22.87%    |
| 53      | 29.37%    |
| 54      | 37.10%    |
| 55      | 46.20%    |
| 56      | 50%       |
| 57+     | 50%       |

**Дизайн-логика:**
- До lvl 40 — безопасная зона, смерть бесплатна
- 40–56 — агрессивная кубическая кривая (16 уровней), штраф растёт нелинейно
- 57+ — максимальный cap 50% текущего XP
- XP loss уменьшает только прогресс внутри текущего уровня (derank невозможен)

---

## Побег (Flee)

1. `combat:flee` → { sessionId }
2. BE: stopCombatLoop, удаление Redis-сессии
3. **Gold потерян, loot потерян**
4. **XP сохранён** — уже начислен за каждый килл
5. **XP Loss НЕ применяется** — штраф только при смерти
6. BE: `combat:fled` → FE возврат на карту

---

## Распределение данных

| Данные | Куда | Когда | При смерти/побеге |
|--------|------|-------|-------------------|
| XP | Character.xp/level | Per-kill (сразу) | Сохранён (минус XP Loss при смерти) |
| Gold | PlayerLeague.gold | Complete only | Потерян |
| Bag items | BagItem → PlayerLeague | Complete only | Потеряны |
| Meta stats | Player.totalGold/kills/taps | Complete only | Не записаны |
| Locations | Character.completedLocations | Complete only | Не записана |
| Endgame | Character.totalMapsRun etc. | Complete only | Не записаны |
