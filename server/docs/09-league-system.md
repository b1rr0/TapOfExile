# 09 — League System

## Overview

Tap of Exile uses a league system inspired by PoE/Hearthstone:

- **Standard** — permanent league, always active
- **Monthly** — seasonal league, resets on the 1st of each month

## Rules

| Scope | Shared? | Bound to |
|-------|---------|----------|
| Gold | Per-league | PlayerLeague |
| Bag (keys) | Per-league | PlayerLeague |
| Level / XP | Per-character | Character |
| Equipment | Per-character | Character |
| Skill tree | Per-character | Character |
| Lifetime stats | Global | Player |

## Database Schema

### `leagues` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(128) | "Standard", "Monthly – Feb 2026" |
| type | varchar(16) | `standard` or `monthly` |
| status | varchar(16) | `active`, `completed`, `migrating` |
| startsAt | timestamptz | League start date |
| endsAt | timestamptz | null for Standard |
| createdAt | timestamptz | |

### `player_leagues` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| playerTelegramId | bigint FK | → players |
| leagueId | uuid FK | → leagues |
| gold | bigint | Per-league gold pool |
| activeCharacterId | varchar(64) | Per-league active character |
| joinedAt | timestamptz | |
| UNIQUE | | (playerTelegramId, leagueId) |

### Modified tables

- **players** — removed `gold`, `activeCharacterId`; added `activeLeagueId`
- **characters** — added `leagueId`, `playerLeagueId`; removed `bag` relation
- **bag_items** — replaced `characterId` with `playerLeagueId`
- **combat_sessions** — added `leagueId`
- **daily_rewards** — added `leagueId`

## Entity Relationships

```
Player (1) ──< PlayerLeague (many)
                 ├── gold
                 ├── activeCharacterId
                 ├── characters[] ──> Character (many)
                 └── bag[] ──> BagItem (many)

League (1) ──< PlayerLeague (many)
```

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leagues` | List active leagues |
| GET | `/leagues/:id/leaderboard` | League leaderboard |

### Authenticated (JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/leagues/my` | Player's leagues |
| GET | `/leagues/active` | Active league info |
| POST | `/leagues/:id/join` | Join a league |
| POST | `/leagues/switch` | Switch active league |

## Monthly Migration

CRON job runs at `00:00 UTC` on the 1st of each month:

1. Find the active monthly league
2. Set status → `migrating`
3. For each player in the monthly league:
   - Find/create their Standard PlayerLeague
   - Merge gold: `standard.gold += monthly.gold`
   - Move all characters → Standard
   - Move all bag items → Standard
4. Set monthly league status → `completed`
5. Create new monthly league
6. Switch affected players to Standard

The migration runs in a DB transaction for data integrity.

## Player Flow

### New Player
1. Auth → Player created
2. Auto-join Standard league (via LeagueService.onModuleInit)
3. Create first character in Standard

### Joining Monthly League
1. `POST /leagues/:monthlyId/join` → creates PlayerLeague with gold=0
2. `POST /leagues/switch` → switch to monthly
3. Create new character (starts at level 1)
4. Play in monthly league
5. At month end → characters + gold + bag merge into Standard

### Switching Leagues
1. `POST /leagues/switch` with target leagueId
2. All subsequent operations (combat, loot, etc.) use the active league context
3. Player can switch back and forth freely

## Gold Flow

```
Combat completion → PlayerLeague.gold += reward
                  → Player.totalGold += reward (global stat)

Skill tree reset  → PlayerLeague.gold -= cost

Daily reward      → PlayerLeague.gold += reward amount
```

## Bag (Inventory)

The bag is shared among all characters within a league:
- Character A finds a Tier 5 map key → goes to the league bag
- Character B can use that same key
- Max 32 items per league bag
