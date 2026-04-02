# Maps and Monsters

## General Architecture

The combat system is **server-authoritative** — all calculations (damage, HP, rewards) are done on the backend via **WebSocket** (Socket.IO, namespace `/combat`). The frontend is display-only.

## Key Files

| File | Purpose |
|------|---------|
| `shared/endgame-maps.ts` | Tier definitions, bosses, waves, drop logic |
| `shared/monster-attacks.ts` | 8 monster types x 5 attacks, weighted random |
| `shared/balance.ts` | All numeric balance constants (`B`) |
| `server/src/level-gen/level-gen.service.ts` | Monster generation and queue building |
| `server/src/level-gen/monster-types.ts` | Monster types, rarity, resistances |
| `server/src/combat/combat.gateway.ts` | WebSocket gateway (namespace `/combat`) |
| `server/src/combat/combat.service.ts` | Server-authoritative combat logic |
| `server/src/combat/elemental-damage.ts` | Elemental damage calculation |
| `bot/src/scenes/map-scene.ts` | Location selection UI (5 acts x 10 locations) |
| `bot/src/scenes/map-device-scene.ts` | Endgame map selection UI |
| `bot/src/scenes/combat-scene.ts` | Combat UI |
| `bot/src/game/combat.ts` | FE combat manager (CombatManager) |

---

## Story Mode (5 acts x 10 locations)

Each act has 10 locations (orders 1-10). Orders 1-8 are the main chain, 9-10 are side branches.

### Location Access Rules

- Act 1, Order 1 — always available
- Completed locations — always replayable
- Transitioning between acts: previous act requires >= 8 completed main-chain locations
- Within an act, unlock order: `REQUIREMENT_ORDER = [0,1,2,3,4,5,6,7,3,5]`
  - Order N requires `REQUIREMENT[N-1]` to unlock
  - Example: Order 9 requires Order 3, Order 10 requires Order 5

### Monster Level

```
monsterLevel = (act - 1) * 10 + order
```

Range: 1 (Act 1 Order 1) — 50 (Act 5 Order 10).

### Scaling Formulas (Story Mode)

```
actMul = ACT_SCALING_BASE ^ (act - 1)     // 2.5^(act-1)

HP     = MONSTER_HP_BASE   * HP_GROWTH^(order-1)   * rarity.hpMul   * actMul * [1 ± HP_RANDOM]
Gold   = MONSTER_GOLD_BASE * GOLD_GROWTH^(order-1)  * rarity.goldMul * actMul
XP     = MONSTER_XP_BASE   * XP_GROWTH^(order-1)    * rarity.xpMul   * actMul
Damage = MONSTER_DMG_BASE  * DMG_GROWTH^(order-1)   * RARITY_DMG_MUL * actMul * [1 ± DMG_RANDOM]
```

### Current Balance Values

| Constant | Value |
|----------|-------|
| `ACT_SCALING_BASE` | 2.5 |
| `MONSTER_HP_BASE` | 10 |
| `MONSTER_HP_GROWTH` | 1.5 |
| `MONSTER_HP_RANDOM` | 0.15 (±15%) |
| `MONSTER_GOLD_BASE` | 3 |
| `MONSTER_GOLD_GROWTH` | 1.35 |
| `MONSTER_XP_BASE` | 5 |
| `MONSTER_XP_GROWTH` | 1.3 |
| `MONSTER_DMG_BASE` | 3 |
| `MONSTER_DMG_GROWTH` | 1.4 |
| `MONSTER_DMG_RANDOM` | 0.10 (±10%) |

### Location Rewards (base, before act scaling)

| Order | Gold | XP  | Type |
|-------|------|-----|------|
| 1     | 60   | 40  | Main chain |
| 2     | 100  | 65  | Main chain |
| 3     | 140  | 95  | Main chain |
| 4     | 190  | 130 | Main chain |
| 5     | 260  | 180 | Main chain |
| 6     | 350  | 240 | Main chain |
| 7     | 450  | 320 | Main chain |
| 8     | 600  | 450 | Main chain |
| 9     | 300  | 220 | Side branch |
| 10    | 420  | 300 | Side branch |

---

## Endgame Maps (Tier 1-10)

Unlock after completing all 5 acts (>= 8 main-chain locations in each).

### Map Tiers (MAP_TIERS)

Use Act 5 Order 10 as the base point (`MAP_BASE_ACT=5, MAP_BASE_ORDER=10`), multiplied by tier:

| Tier | HP mul. | Gold mul. | XP mul. | Monster Level |
|------|---------|-----------|---------|---------------|
| 1   | 1.0    | 1.0      | 1.0    | 41              |
| 2   | 1.5    | 1.4      | 1.3    | 42              |
| 3   | 2.2    | 1.9      | 1.7    | 44              |
| 4   | 3.2    | 2.5      | 2.2    | 45              |
| 5   | 4.5    | 3.2      | 2.8    | 46              |
| 6   | 6.5    | 4.2      | 3.5    | 47              |
| 7   | 9.0    | 5.5      | 4.5    | 48              |
| 8   | 13.0   | 7.2      | 5.8    | 50              |
| 9   | 18.0   | 9.5      | 7.5    | 51              |
| 10  | 25.0   | 13.0     | 10.0   | 52              |

Level formula: `40 + round(mapTier * 1.2)`

### Scaling Formulas (Map Mode)

```
HP   = 10 * 1.5^9 * rarityMul * 2.5^4 * tierHpMul
Gold = 3  * 1.35^9 * rarityMul * 2.5^4 * tierGoldMul
XP   = 5  * 1.3^9  * rarityMul * 2.5^4 * tierXpMul
```

### Wave Templates

| Tier Range | Number of Waves |
|------------|----------------|
| 1-2        | 3              |
| 3-4        | 4              |
| 5-6        | 4              |
| 7-8        | 4              |
| 9-10       | 5              |

---

## Bosses (BOSS_MAPS) — 8 Bosses

Each boss: 2 trash waves + boss monster (3 waves).

| Boss | Type | HP mul. | Gold mul. | XP mul. |
|------|------|---------|-----------|---------|
| Shadow Shogun's Domain | Shogun | 8.0 | 10.0 | 8.0 |
| Dragon's Eternal Lair | Dragon | 10.0 | 12.0 | 10.0 |
| Oni Warlord's Throne | Oni | 7.0 | 9.0 | 7.0 |
| Tengu Mountain Peak | Tengu | 9.0 | 11.0 | 9.0 |
| Ronin's Haunted Dojo | Ronin | 6.0 | 8.0 | 6.0 |
| Spirit of the Ancient Wood | Forest Spirit | 7.5 | 9.5 | 7.5 |
| The Beast King's Arena | Wild Boar | 6.5 | 8.5 | 6.5 |
| Bandit Lord's Fortress | Bandit | 5.5 | 7.5 | 5.5 |

### Boss Key Tiers (3 difficulty levels)

| Tier | Name | Quality | HP | Gold | XP |
|------|------|---------|----|----|-----|
| 1 | Standard | boss_silver | 1.0x | 1.0x | 1.0x |
| 2 | Empowered | boss_gold | 1.8x | 2.0x | 1.8x |
| 3 | Mythic | boss_red | 3.0x | 3.5x | 3.0x |

Boss key tier selection on drop:
- Map tier 5-6 → boss_tier 1
- Map tier 7-8 → boss_tier 2
- Map tier 9-10 → boss_tier 3
- Boss maps → always boss_tier 3

---

## Monster Types (8)

| Type | Base Resistances | Primary Element |
|------|-----------------|-----------------|
| Bandit | Physical | Physical |
| Wild Boar | Physical | Physical |
| Forest Spirit | Cold | Cold + Pure |
| Ronin | Physical + Lightning | Physical + Lightning |
| Oni | Fire | Fire |
| Tengu | Lightning + Cold | Lightning |
| Dragon | Multi-element | Fire + Pure |
| Shogun | All elements | Physical + Lightning + Pure |

Each type has **5 unique attacks** with different elemental splits, speeds, and weights.

### Rarity Multipliers

| Rarity | HP mul. | Gold mul. | XP mul. | DMG mul. | Resistance Bonus |
|--------|---------|-----------|---------|----------|-----------------|
| Common | 1.0 | 1.0 | 1.0 | 1.0 | +0% |
| Rare | 1.6 | 1.5 | 1.4 | 1.3 | +5% |
| Epic | 2.5 | 2.2 | 2.0 | 1.8 | +10% |
| Boss | 4.0 | 3.5 | 3.0 | 2.5 | +15% |

Resistance cap: **75%** per element.

---

## Elemental System

### Damage Elements
`physical`, `fire`, `lightning`, `cold`, `pure`

Pure damage ignores all resistances.

### Damage Calculation

```
For each element:
  fraction  = damageProfile[element]
  rawElem   = totalDamage * fraction
  resist    = target.resistance[element]   (0 for pure)
  effective = floor(rawElem * (1 - resist))

total = sum(effective)
Minimum 1 damage if rawDamage > 0
```

Default profile: `{ physical: 1.0 }` — 100% physical.
Elemental splits come from skill-tree nodes, not from the class.

---

## Monster Queue (buildMonsterQueue)

```
for each wave → for each spawn → for i in 0..count → create monster → push to queue
```

Stored in Redis: `combat:session:{uuid}` with TTL 30 minutes.

---

## FE → BE Flow (WebSocket)

```
1. Player selects location/key       → map-scene.ts / map-device-scene.ts
2. FE: preconnectSocket()            → starts Socket.IO connection
3. FE: emit "combat:start-location"  → { locationId, waves, order, act }
   or "combat:start-map"             → { mapKeyItemId, direction? }
4. BE: validation, buildMonsterQueue → Creates Redis session
5. BE: emit "combat:started"         → { sessionId, currentMonster, playerHp }
6. FE: Entrance animation            → Loading run → monster entrance
7. FE: emit "combat:entrance-done"   → BE starts combat loop (200ms tick)
8. FE: emit "combat:tap"             → { sessionId } (repeated)
9. BE: processTap(), emit "tap-result" → { damage, isCrit, killed, playerHp }
10. BE: processEnemyTick (every 200ms) → emit "enemy-attack" → { attacks[], playerHp }
11. On killed: stopCombatLoop, wait for entrance-done
12. All dead → FE emit "combat:complete" → BE emit "combat:completed"
13. BE: credits gold/xp/drops          → Deletes Redis session
14. FE: Victory scene                  → Shows rewards
```
