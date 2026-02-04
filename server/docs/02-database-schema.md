# Database Schema

## Entity Relationship Diagram

```
Player (1) ──────< (N) Character
                         │
                         ├──< (N) BagItem
                         └──< (N) SkillAllocation

Player (1) ──────< (N) DailyReward

CombatSession (standalone audit log)
```

## Tables

### players
| Column | Type | Description |
|--------|------|-------------|
| telegramId | bigint PK | Telegram user ID |
| telegramUsername | varchar(128) | @username |
| telegramFirstName | varchar(256) | Display name |
| gold | bigint | Global gold pool |
| activeCharacterId | varchar(64) | FK to characters |
| totalTaps | bigint | Lifetime taps |
| totalKills | bigint | Lifetime kills |
| totalGold | bigint | Lifetime gold earned |
| gameVersion | int | Data version (V4) |
| lastSaveTime | bigint | Unix timestamp ms |
| createdAt | timestamp | Record creation |
| updatedAt | timestamp | Last update |

### characters
| Column | Type | Description |
|--------|------|-------------|
| id | varchar(64) PK | e.g. "char_1706000000000_a1b2" |
| playerTelegramId | bigint FK | → players.telegramId |
| nickname | varchar(64) | Character name |
| classId | varchar(32) | samurai/warrior/mage/archer |
| skinId | varchar(64) | Sprite skin ID |
| level | int | Current level |
| xp | bigint | Current XP |
| xpToNext | bigint | XP threshold |
| tapDamage | int | Base tap damage |
| critChance | float | 0-1 probability |
| critMultiplier | float | Crit damage multiplier |
| passiveDps | float | Passive damage/sec |
| completedLocations | jsonb | Array of location IDs |
| currentLocation | varchar(128) | Active location |
| currentAct | int | Current act (1-5) |
| equipment | jsonb | Equipped items map |
| endgameUnlocked | boolean | Endgame access |
| completedBosses | jsonb | Array of boss IDs |
| highestTierCompleted | int | Max map tier cleared |
| totalMapsRun | int | Maps completed count |

### bag_items
| Column | Type | Description |
|--------|------|-------------|
| id | varchar(128) PK | Item ID |
| characterId | varchar(64) FK | → characters.id |
| name | varchar(128) | Display name |
| type | varchar(32) | map_key / boss_map_key / equipment |
| quality | varchar(32) | common/rare/epic/legendary/boss_* |
| tier | int | Map tier (1-10) |
| bossId | varchar(128) | Boss map ID |
| bossKeyTier | int | Boss key difficulty (1-3) |

### skill_allocations
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment |
| characterId | varchar(64) FK | → characters.id |
| nodeId | int | Skill tree node ID |
| allocatedAt | timestamp | When allocated |
| **UNIQUE** | (characterId, nodeId) | No duplicates |

### combat_sessions (audit)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Session ID |
| playerTelegramId | bigint | Player |
| characterId | varchar(64) | Character used |
| mode | varchar(32) | location/map/boss_map |
| totalMonsters | int | Monsters in session |
| monstersKilled | int | Monsters defeated |
| totalGoldEarned | bigint | Gold awarded |
| totalXpEarned | bigint | XP awarded |
| totalTaps | int | Taps in session |
| status | varchar(16) | active/completed/abandoned |

### daily_rewards
| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | Auto-increment |
| playerTelegramId | bigint | Player |
| day | int | Streak day (1-30) |
| rewardType | varchar(32) | gold/map_key/boss_key |
| rewardData | jsonb | Reward parameters |
| claimedAt | timestamp | Claim timestamp |
