# Loot Drop Calculations

## Key Files

| File | Purpose |
|------|---------|
| `shared/endgame-maps.ts` | `rollMapDrops()` — main drop logic |
| `server/src/loot/loot.service.ts` | Wrapper: calls rollMapDrops + bag management |
| `shared/balance.ts` | Monster reward balance constants |
| `server/src/combat/combat.service.ts` | Calls loot on complete |

## Drop Settings (shared/endgame-maps.ts)

### Regular Maps

```
60% → Key of same tier
20% → Key of tier+1 (cap: MAX_TIER=10)
 5% → Boss key (only if tier >= 5)
```

- Tier+1 triggers only if same-tier didn't drop
- Boss key — random boss from 8

### Boss Maps

```
Guaranteed: 1-2 regular keys (tier 5-8)
  - Tier: Math.random() * (max-min) + min
30% → Bonus key of tier+1
 5% → Boss key (tier 3, random boss)
```

## Boss Key Tier Selection (pickBossKeyTier)

| Source | Boss Key Tier |
|--------|---------------|
| Boss maps | Always tier 3 (Mythic) |
| Regular tier 9-10 | Tier 3 (Mythic) |
| Regular tier 7-8 | Tier 2 (Empowered) |
| Regular tier 5-6 | Tier 1 (Standard) |

## Key Quality by Tier (tierQuality)

| Map Tier | Quality |
|----------|---------|
| 1-3 | common |
| 4-6 | rare |
| 7-9 | epic |
| 10 | legendary |

## Dropped Key Structure

### Map Key:

```typescript
{
  id: `map_t${tier}_${timestamp}_${random}`,
  name: `Tier ${tier} Map`,
  type: "map_key",
  tier: number,
  quality: "common" | "rare" | "epic" | "legendary",
  level: tier,
  icon: "🗺️",
  acquiredAt: Date.now()
}
```

### Boss Key:

```typescript
{
  id: `bosskey_${bossId}_t${bossKeyTier}_${timestamp}_${random}`,
  name: "{Boss Name}",
  type: "boss_map_key",
  bossId: string,
  bossKeyTier: 1 | 2 | 3,
  quality: "boss_silver" | "boss_gold" | "boss_red",
  level: bossKeyTier,
  icon: "{boss emoji}",
  acquiredAt: Date.now()
}
```

## Bag Management (loot.service.ts)

- **Max bag size: 32 items**
- On overflow — oldest items are evicted (FIFO)
- `addItemsToBag()` persists to DB

## Monster Rewards (balance.ts)

### Location-Based (Story Mode)

| Order | Gold | XP |
|-------|------|----|
| 1 | 60 | 40 |
| 2 | 100 | 65 |
| 3 | 140 | 95 |
| 4 | 190 | 130 |
| 5 | 260 | 180 |
| 6 | 350 | 240 |
| 7 | 450 | 320 |
| 8 | 600 | 450 |
| 9 | 300 | 220 |
| 10 | 420 | 300 |

These values are multiplied by rarity mul and tier/act mul.

### XP Progression (Leveling)

```
xpToNext = Math.floor(XP_BASE * XP_GROWTH^(level-1))
         = Math.floor(100 * 1.3^(level-1))
```

## Endgame Unlock

Unlocks after completing all 5 acts (8+ locations in each).

Starter kit:
- 3 Tier 1 keys (`B.ENDGAME_STARTER_KEYS = 3, ENDGAME_STARTER_TIER = 1`)

## Drop Pipeline

```
1. Combat complete                          → combat.service.ts
2. If endgame: rollMapDrops(tier, isBoss)   → shared/endgame-maps.ts
3. Drops → loot.service.addItemsToBag()     → DB persist
4. Response to client: mapDrops[]           → BagItem[]
5. FE: state.bag.push(...mapDrops)          → state.ts
6. FE: Victory scene shows drops            → victory-scene.ts
```

## Key Formulas Summary

```
Monster Gold = baseGold * rarityMul * tierGoldMul (or actMul for story)
Monster XP   = baseXp   * rarityMul * tierXpMul
Map Drop     = rollMapDrops(tier, isBoss, direction)
Boss Key Tier = f(source tier): 5-6→1, 7-8→2, 9-10→3, boss→3
Key Quality  = f(tier): 1-3→common, 4-6→rare, 7-9→epic, 10→legendary
```
