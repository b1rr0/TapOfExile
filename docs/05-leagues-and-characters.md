# Leagues and Characters

## Key Files

| File | Purpose |
|------|---------|
| `server/src/league/league.service.ts` | League management, join/switch, auto-seeding |
| `server/src/league/league-migration.service.ts` | CRON migration monthly→standard |
| `server/src/character/character.service.ts` | Character creation and management |
| `server/src/character/dto/create-character.dto.ts` | Creation validation |
| `server/src/shared/entities/character.entity.ts` | Character entity |
| `server/src/shared/entities/player-league.entity.ts` | PlayerLeague join table |
| `server/src/shared/entities/league.entity.ts` | League entity |
| `shared/class-stats.ts` | Class definitions, statsAtLevel() |
| `bot/src/scenes/character-create-scene.ts` | FE: character creation |
| `bot/src/scenes/character-select-scene.ts` | FE: character selection |

## League Types

| Type | Description | endsAt |
|------|------------|--------|
| Standard | Permanent, always active | null |
| Monthly | Temporary, for 1 month | end date |

Monthly league names are Japanese months: "Ichigatsu 2026", "Nigatsu 2026", "Sangatsu 2026", etc.

Auto-seeding: on server start (`onModuleInit`) creates Standard and current Monthly league if they don't exist.

## League Statuses

- `active` — current, can play
- `completed` — after migration, cannot play
- `migrating` — transfer in progress

## Key Relationship: PlayerLeague

```
Player ←(1:N)→ PlayerLeague ←(N:1)→ League
                    ↓ (1:N)
               Character
               BagItem
```

### PlayerLeague entity:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| playerTelegramId | bigint | FK → Player |
| leagueId | UUID | FK → League |
| gold | string (BigInt) | Gold in this league |
| activeCharacterId | varchar | Active character in league |
| joinedAt | timestamp | Join date |

**UNIQUE(playerTelegramId, leagueId)** — cannot join twice.

## Character Entity

| Category | Fields |
|----------|--------|
| Identity | id, playerTelegramId, leagueId, playerLeagueId, nickname, classId, skinId |
| Base Stats | level, xp, xpToNext, hp, maxHp, tapDamage, critChance, critMultiplier, dodgeChance, specialValue |
| Elemental | elementalDamage (JSONB), resistance (JSONB) |
| Locations | completedLocations[], currentLocation, currentAct |
| Equipment | equipment (JSONB), allocatedNodes[] |
| Endgame | endgameUnlocked, completedBosses[], highestTierCompleted, totalMapsRun |
| Daily Bonus | dailyBonusWinsUsed, dailyBonusResetDate |

### Initial values on creation:

```
level=1, xp=0, xpToNext=100
hp/maxHp = CLASS_DEFS[classId].base.hp (100 for all)
tapDamage = CLASS_DEFS[classId].base.tapDamage (2)
critChance = 0.05, critMultiplier = 1.5
dodgeChance = CLASS_DEFS[classId].base.dodgeChance (0.02-0.06)
specialValue = specialAtLevel(classId, 1)
elementalDamage = { physical: 1.0 }
resistance = CLASS_DEFS[classId].base.resistance
endgameUnlocked = false
dailyBonusWinsUsed = 0
```

### Classes and default skins:

| Class | Skin | Special | Description |
|-------|------|---------|-------------|
| samurai | samurai_1 | Lethal Precision | Bonus crit damage multiplier |
| warrior | knight_1 | Block | Chance to block attacks |
| mage | wizard_1 | Spell Amplify | Chance to amplify dmg 2.5x |
| archer | archer_1 | Double Shot | Chance to fire twice |

## Character Creation (character.service.ts)

1. If `leagueId` provided → auto-join league, switch active league
2. Limit check: max 10 characters per league
3. ID: `char_${timestamp}_${random}`
4. Initialization with starting values from `CLASS_DEFS[classId]` via `statsAtLevel(classId, 1)`
5. Auto-activate if first in league

### DTO validation (create-character.dto.ts):

- nickname: `@MaxLength(64)`
- classId: `@IsIn(['samurai', 'warrior', 'mage', 'archer'])`
- leagueId: `@IsUUID()` (optional)

## Character Progression

```
XP Level Scaling: scaledXp = baseXp / (1 + 0.4 * D^2), D = |playerLevel - monsterLevel|
xpToNext = XP_BASE * XP_GROWTH^(level-1) = 100 * 1.3^(level-1)
MAX_LEVEL = 60

On level up: recalculate all stats via statsAtLevel(classId, newLevel)
```

Daily bonus: first 3 wins per day give x3 XP. Reset at UTC 00:00.

## League Migration (league-migration.service.ts)

**CRON**: `0 0 1 * *` — 00:00 UTC on the first day of each month.

### Process:

```
1. Check: is there a monthly league with expired endsAt
2. For each player in the monthly league:
   a. Find/create PlayerLeague in Standard
   b. Merge gold: standard.gold += monthly.gold
   c. Transfer characters: update leagueId → Standard
   d. Transfer bag items
   e. Delete empty monthly PlayerLeague
3. Switch players to Standard if active = monthly
4. Mark monthly league as "completed"
5. Create next month's league
```

Everything in a TypeORM transaction — rollback on error.

## Data Scoping

| Data | Scope |
|------|-------|
| Gold | Per-league (PlayerLeague.gold) |
| Characters | Per-league (bound permanently via leagueId) |
| Bag items | Per-league (shared between characters in the league) |
| Active character | Per-league (PlayerLeague.activeCharacterId) |
| Active league | Global per player (Player.activeLeagueId) |
| Meta stats | Global per player (Player.totalGold/kills/taps) |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/leagues` | No | All active leagues |
| GET | `/leagues/my` | JWT | Player's leagues |
| POST | `/leagues/:leagueId/join` | JWT | Join |
| POST | `/leagues/switch` | JWT | Switch (body: `{leagueId}`) |
| GET | `/characters` | JWT | Characters of active league |
| POST | `/characters` | JWT | Create |
| GET | `/characters/:id` | JWT | Get character |
| POST | `/characters/:id/activate` | JWT | Activate |
| PUT | `/characters/:id/skin` | JWT | Change skin |
