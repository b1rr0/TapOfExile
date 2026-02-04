# Rewards System Plan

## Daily Login Rewards

30-day rotating schedule. Missing a day (>48h gap) resets streak to day 1.

### Schedule

| Day | Reward | Amount/Tier |
|-----|--------|-------------|
| 1 | Gold | 100 |
| 2 | Gold | 200 |
| 3 | Map Key | Tier 1 |
| 4 | Gold | 500 |
| 5 | Gold | 750 |
| 6 | Map Key | Tier 2 |
| 7 | Map Key | Tier 3 |
| 8-14 | Escalating gold + keys | Up to Tier 6 |
| 15 | Gold | 5,000 |
| 21 | Boss Key | Standard |
| 27 | Boss Key | Empowered |
| 30 | Boss Key | Mythic |

### Storage
- Streak tracked in Redis: `daily:streak:{telegramId}`
- Claim history in PostgreSQL: `daily_rewards` table
- Server-side time validation (no client clock trust)

## Achievement System (Future)

Event-driven milestone rewards.

### Proposed Achievements

| ID | Name | Condition | Reward |
|----|------|-----------|--------|
| FIRST_KILL | First Blood | Kill 1 monster | 50 gold |
| ACT_1_COMPLETE | Act I Clear | Complete Act 1 | 500 gold |
| ACT_5_COMPLETE | Act V Clear | Complete Act 5 | 8,000 gold |
| LEVEL_25 | Rising Star | Reach level 25 | 1,000 gold |
| LEVEL_100 | Legend | Reach level 100 | Tier 10 key |
| BOSS_SLAYER | Boss Slayer | Defeat all 8 bosses | Mythic boss key |
| TIER_10_CLEAR | Apex Predator | Clear Tier X map | 50,000 gold |
| TAP_10K | Tap Master | 10,000 total taps | 2,000 gold |
| GOLD_1M | Gold Hoarder | 1M lifetime gold | 10,000 gold |

### Implementation Plan

1. Add `AchievementProgress` entity (playerTelegramId, achievementId, progress, completed)
2. Create `AchievementService` with event listeners
3. Hook into existing events: monster kill, location complete, level up, boss kill
4. Grant one-time rewards on completion
5. Support future achievement types: cosmetics, titles, special keys

## Loot Drop System

All drop calculations happen server-side.

### Regular Map Drops
- 60% same-tier key
- 20% tier+1 key
- 5% boss key (from tier 5+)

### Boss Map Drops
- Guaranteed key (tier 5-8)
- 30% bonus key (tier+1)
- 5% boss key (Mythic tier)

### Future Expansion
- Equipment drops from bosses
- Crafting materials
- Consumables (XP boost, gold boost)
- Seasonal event rewards
