# Database Schema

## Entity Relationship Diagram

```
Player (1) ──< PlayerLeague (N) >── League (1)
                    │
                    ├──< Character (N)
                    └──< BagItem (N)

CombatSession (standalone audit log)
```

## Tables

### players
| Column | Type | Description |
|--------|------|-------------|
| telegramId | bigint PK | Telegram user ID (stored as string in JS) |
| telegramUsername | varchar(128) | @username (nullable, auto-updated on login) |
| telegramFirstName | varchar(256) | Display name (nullable) |
| activeLeagueId | uuid | Currently selected league |
| totalTaps | bigint | Lifetime taps (global counter) |
| totalKills | bigint | Lifetime kills |
| totalGold | bigint | Lifetime gold earned |
| gameVersion | int | Data version (4) |
| lastSaveTime | bigint | Unix timestamp ms |
| createdAt | timestamp | Record creation |
| updatedAt | timestamp | Last update |

### leagues
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| name | varchar(128) | "Standard" or "Ichigatsu 2026" etc. |
| type | varchar(16) | `standard` or `monthly` |
| status | varchar(16) | `active`, `completed`, `migrating` |
| startsAt | timestamptz | League start date |
| endsAt | timestamptz | null for Standard |
| createdAt | timestamptz | |

### player_leagues
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Auto-generated |
| playerTelegramId | bigint FK | → players.telegramId |
| leagueId | uuid FK | → leagues.id |
| gold | bigint | Per-league gold pool (stored as string) |
| activeCharacterId | varchar(64) | Per-league active character |
| joinedAt | timestamptz | Join date |
| **UNIQUE** | | (playerTelegramId, leagueId) |

### characters
| Column | Type | Description |
|--------|------|-------------|
| id | varchar PK | e.g. "char_1706000000000_a1b2" |
| playerTelegramId | bigint FK | → players.telegramId |
| leagueId | uuid FK | → leagues.id |
| playerLeagueId | uuid FK | → player_leagues.id |
| nickname | varchar(64) | Character name |
| classId | varchar(32) | samurai/warrior/mage/archer |
| skinId | varchar(64) | Sprite skin ID |
| level | int | Current level (1-60) |
| xp | bigint | Current XP |
| xpToNext | bigint | XP threshold for next level |
| hp | int | Current HP |
| maxHp | int | Maximum HP |
| tapDamage | int | Base tap damage |
| critChance | float | 0-1 probability |
| critMultiplier | float | Crit damage multiplier |
| dodgeChance | float | 0-1 probability |
| specialValue | float | Class-specific (block%, doubleStrike%, etc.) |
| elementalDamage | jsonb | Damage split `{physical:1.0}` |
| resistance | jsonb | `{physical:0, fire:0, lightning:0, cold:0}` |
| completedLocations | jsonb | Array of location IDs |
| currentLocation | varchar(128) | Active location |
| currentAct | int | Current act (1-5) |
| equipment | jsonb | Equipped items map (future) |
| allocatedNodes | jsonb | Skill tree node IDs |
| endgameUnlocked | boolean | Endgame access |
| completedBosses | jsonb | Array of boss IDs |
| highestTierCompleted | int | Max map tier cleared |
| totalMapsRun | int | Maps completed count |
| dailyBonusWinsUsed | int | 0-3, daily bonus tracker |
| dailyBonusResetDate | varchar | YYYY-MM-DD, UTC reset |
| combatCurrentStage | int | Legacy (unused) |
| combatCurrentWave | int | Legacy (unused) |

### bag_items
| Column | Type | Description |
|--------|------|-------------|
| id | varchar(128) PK | Item ID |
| playerLeagueId | uuid FK | → player_leagues.id |
| name | varchar(128) | Display name |
| type | varchar(32) | map_key / boss_map_key |
| quality | varchar(32) | common/rare/epic/boss_silver/boss_gold/boss_red |
| level | int | Item level |
| tier | int | Map tier (1-10) |
| icon | varchar(32) | Emoji icon |
| acquiredAt | bigint | Timestamp |
| locationId | varchar | Drop source location |
| locationAct | int | Drop source act |
| bossId | varchar(128) | Boss map ID |
| bossKeyTier | int | Boss key difficulty (1-3) |

### combat_sessions (audit)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Session ID (matches Redis) |
| playerTelegramId | bigint | Player |
| characterId | varchar(64) | Character used |
| leagueId | uuid | League context |
| mode | varchar(32) | location/map/boss_map |
| locationId | varchar | For location mode |
| mapTier | int | For map/boss_map mode |
| bossId | varchar | For boss_map mode |
| totalMonsters | int | Monsters in session |
| monstersKilled | int | Monsters defeated |
| totalGoldEarned | bigint | Gold awarded |
| totalXpEarned | bigint | XP awarded |
| totalTaps | int | Taps in session |
| startedAt | timestamptz | Session start |
| completedAt | timestamptz | Session end |
| status | varchar(16) | active/completed/abandoned/flagged |

## Redis Keys

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `combat:session:{uuid}` | Active combat session (JSON) | 30 min |
| `auth:refresh:{telegramId}` | Refresh token | 30 days |

## Notes

- Gold stored as bigint string in JS (BigInt() for arithmetic, String() for storage)
- TypeORM defaults apply on INSERT only, not existing rows
- Old characters may have `maxHp = 0` (pre-HP-initialization bug)
- `combatCurrentStage`/`combatCurrentWave` are legacy fields, not currently used
