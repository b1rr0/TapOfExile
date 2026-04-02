# Reward System

## Key Files

| File | Purpose |
|------|---------|
| `server/src/combat/combat.service.ts` | `processTap()` — XP per kill; `completeSession()` — gold + loot |
| `server/src/combat/combat.gateway.ts` | WebSocket gateway |
| `server/src/loot/loot.service.ts` | Drop rolling, bag management |
| `shared/endgame-maps.ts` | `rollMapDrops()` — key drop logic |
| `shared/balance.ts` | Balance constants |
| `bot/src/game/state.ts` | Client state update |

---

## When rewards are credited

| Reward | Moment | Loss on death |
|--------|--------|---------------|
| **XP** | Per monster killed (immediately) | XP Loss by formula (lvl 40+) |
| **Gold** | Only on full completion | All lost |
| **Loot** | Only on full completion | All lost |

**Key principle**: XP is a reward for combat progress (each kill). Gold and loot are rewards for completion (all or nothing).

---

## 1. XP → per monster killed

Credited in `processTap()` at the moment `monster.currentHp <= 0`.

### XP Level Scaling
```
scaledXp = baseXp / (1 + XP_LEVEL_SCALING_A * D²)
D = |playerLevel - monsterLevel|, A = 0.4
```

Monster at the same level as the player → full XP. Difference of ±5 levels → XP drops significantly.

### Daily Bonus (first 3 kills/day)
```
if dailyBonusKillsUsed < 3:
  xp *= 3  (triple XP)
  dailyBonusKillsUsed++
```
Resets at UTC 00:00 (by `dailyBonusResetDate` as YYYY-MM-DD).

### Level Up (instant, at the moment of kill)
```typescript
xpToNext = Math.floor(B.XP_BASE * Math.pow(B.XP_GROWTH, char.level - 1))
// = Math.floor(100 * 1.3^(level-1))

while (char.xp >= char.xpToNext) {
  char.xp -= char.xpToNext
  char.level++
  // Recalculate all stats via statsAtLevel(classId, level)
}
```
MAX_LEVEL = 60.

### Server response (in tap-result when killed=true)
```typescript
{
  // ... standard tap-result fields ...
  killed: true,
  xpGained,              // how much XP gained for this monster
  level, xp, xpToNext,   // current values after crediting
  leveledUp,             // true if level up occurred
}
```

### Client (when killed=true)
1. Show `+{xpGained} XP` floater above monster
2. If `leveledUp` — level up animation
3. Update XP bar in UI

---

## 2. Gold + Loot → only on full completion

Credited in `completeSession()` on `combat:complete`.

### Gold → PlayerLeague
```typescript
playerLeague.gold = String(BigInt(pl.gold) + BigInt(session.totalGoldEarned))
```
Gold is stored as BigInt string. Gold accumulates in Redis session for each killed monster, but is written to DB **only on full completion**.

### Loot Drops → BagItem (endgame only)
Calls `lootService.rollMapDrops(tier, isBossMap, direction)` — see [07-loot-calculations.md](./07-loot-calculations.md).
Drops are added to the bag (max 32 items per league).

### Location Completion → Character (story mode)
```typescript
if (mode === 'location' && !completedLocations.includes(locationId)):
  character.completedLocations.push(locationId)
```

### Endgame Stats → Character
```typescript
character.totalMapsRun++
character.highestTierCompleted = Math.max(current, mapTier)
// For boss maps: character.completedBosses.push(bossId) (deduplicated)
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

### Server response (combat:completed)
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

Displays:
- Earned gold (formatted number)
- Total XP for the entire combat
- Level up indicator (if occurred during combat)
- List of dropped keys with CSS classes by quality
- Remaining daily bonus
- "Return to Hideout" button → HideoutScene

---

## Player death

If HP <= 0 (via `combat:player-died` or `tap-result.playerDead`):
1. Combat loop stops
2. Redis session is deleted
3. **Gold lost** — session gold is not written to DB
4. **Loot lost** — drops are not rolled
5. **XP preserved** — all XP for killed monsters already credited (on each kill)
6. **XP Loss** — XP penalty on death (see formula below)
7. FE: DeathScene with "Respawn" → full HP reset → HideoutScene

### XP Loss on death

Cubic curve: penalty grows from 0% to 50% in the level range 40-56.

```
          { 0,                            L <= 40
Loss(L) = { 50 * ((L - 40) / 16)^3,      41 <= L <= 56
          { 50,                            L >= 57
```

Formula in code:
```typescript
function xpLossPercent(level: number): number {
  if (level <= 40) return 0;
  if (level >= 57) return 50;
  return 50 * Math.pow((level - 40) / 16, 3);
}

// Applied on death:
const lostXp = Math.floor(char.xp * xpLossPercent(char.level) / 100);
char.xp = Math.max(0, char.xp - lostXp);
// XP loss does NOT reduce level — only current progress toward the next one
```

**Value table:**

| Level | XP Loss |
|-------|---------|
| <= 40 | 0%      |
| 41    | 0.01%   |
| 42    | 0.10%   |
| 43    | 0.34%   |
| 44    | 0.78%   |
| 45    | 1.56%   |
| 46    | 2.74%   |
| 47    | 4.39%   |
| 48    | 6.59%   |
| 49    | 9.43%   |
| 50    | 13.02%  |
| 51    | 17.46%  |
| 52    | 22.87%  |
| 53    | 29.37%  |
| 54    | 37.10%  |
| 55    | 46.20%  |
| 56    | 50%     |
| 57+   | 50%     |

**Design rationale:**
- Up to lvl 40 — safe zone, death is free
- 40-56 — aggressive cubic curve (16 levels), penalty grows non-linearly
- 57+ — maximum cap of 50% of current XP
- XP loss only reduces progress within the current level (derank is impossible)

---

## Flee

1. `combat:flee` → { sessionId }
2. BE: stopCombatLoop, delete Redis session
3. **Gold lost, loot lost**
4. **XP preserved** — already credited per kill
5. **XP Loss is NOT applied** — penalty only on death
6. BE: `combat:fled` → FE return to map

---

## Data Distribution

| Data | Where | When | On death/flee |
|------|-------|------|---------------|
| XP | Character.xp/level | Per-kill (immediately) | Preserved (minus XP Loss on death) |
| Gold | PlayerLeague.gold | Complete only | Lost |
| Bag items | BagItem → PlayerLeague | Complete only | Lost |
| Meta stats | Player.totalGold/kills/taps | Complete only | Not written |
| Locations | Character.completedLocations | Complete only | Not written |
| Endgame | Character.totalMapsRun etc. | Complete only | Not written |
