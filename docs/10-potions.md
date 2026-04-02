# Potion System (Potions)

## Overview

Potions are the first consumable item in the game. Currently only **healing potions** (red) are implemented.
Potions drop after combat, are stored in the bag, equipped in Q/E slots, and used instantly in combat.

---

## Flask Types

6 types in ascending size and healing power. The larger the flask, the more HP per sip.

| # | Flask Type | Name | Heal per sip (% maxHp) |
|---|-----------|------|------------------------|
| 1 | `small_vial` | Small Vial | 8% |
| 2 | `round_flask` | Round Flask | 12% |
| 3 | `corked_flask` | Corked Flask | 16% |
| 4 | `tall_bottle` | Tall Bottle | 20% |
| 5 | `wide_bottle` | Wide Bottle | 24% |
| 6 | `jug` | Jug | 30% |

---

## Quality (Rarity) → Number of Sips

Potion quality determines the **maximum number of charges** (sips). When a new potion drops, charges = maximum.

| Quality | Border color | Max charges |
|---------|-------------|-------------|
| common | grey | 2 |
| rare | blue | 3 |
| epic | yellow | 4 |
| legendary | orange | 5 |

### Example

> **Wide Bottle (epic)** = 4 sips x 24% maxHp = 96% maxHp total per potion

---

## Sprites

Path: `/assets/potions/{flaskType}/red_{currentCharges}.png`

- Size: 16x16 px
- Color: `red` (for healing potions)
- Files: `red_1.png` ... `red_5.png` — show fill level
- If charges are 0 — slot is displayed as empty

---

## Healing Mechanics

- **Instant** — press the button → HP is restored
- `healAmount = floor(playerMaxHp × healPercent)`
- HP is capped at `playerMaxHp` (cannot exceed maximum)
- **Server-authoritative** — healing is calculated on the server, client displays the result
- Charges decrease by 1 per use
- When charges = 0 → potion is considered used (slot is empty)

---

## Drop System

### When potions drop

Potions can drop after **any** successful combat:
- Locations (story mode, acts 1-5)
- Endgame Maps (tiers 1-10)
- Boss Maps

One combat can drop **0 or 1** potion (binary roll).

### Drops by act (Story Mode)

| Act | Drop chance | Available flasks (weights) | Quality distribution |
|-----|-----------|----------------------|----------------------|
| 1 | 15% | small_vial (70), round_flask (30) | 80% common, 18% rare, 2% epic |
| 2 | 18% | small_vial (40), round_flask (40), corked_flask (20) | 70% common, 25% rare, 5% epic |
| 3 | 20% | round_flask (30), corked_flask (40), tall_bottle (30) | 55% common, 30% rare, 12% epic, 3% legendary |
| 4 | 22% | corked_flask (25), tall_bottle (40), wide_bottle (35) | 40% common, 35% rare, 18% epic, 7% legendary |
| 5 | 25% | tall_bottle (25), wide_bottle (40), jug (35) | 30% common, 35% rare, 25% epic, 10% legendary |

### Drops by map tier (Endgame Maps)

| Map tier | Drop chance | Available flasks (weights) | Quality distribution |
|----------|-----------|----------------------|----------------------|
| 1-2 | 20% | round_flask (30), corked_flask (40), tall_bottle (30) | 55% common, 30% rare, 12% epic, 3% legendary |
| 3-4 | 22% | corked_flask (25), tall_bottle (40), wide_bottle (35) | 40% common, 35% rare, 18% epic, 7% legendary |
| 5-6 | 25% | tall_bottle (20), wide_bottle (40), jug (40) | 30% common, 35% rare, 25% epic, 10% legendary |
| 7-8 | 28% | wide_bottle (40), jug (60) | 20% common, 35% rare, 30% epic, 15% legendary |
| 9-10 | 30% | wide_bottle (30), jug (70) | 10% common, 30% rare, 35% epic, 25% legendary |

### Drops from boss maps (Boss Maps)

| Drop chance | Available flasks (weights) | Quality distribution |
|-----------|----------------------|----------------------|
| 40% | tall_bottle (15), wide_bottle (35), jug (50) | 10% common, 25% rare, 35% epic, 30% legendary |

---

## Data Storage

### In bag (BagItem)

Potions are stored as regular `BagItem` with additional fields:

```
type:           'potion'
quality:        'common' | 'rare' | 'epic' | 'legendary'
flaskType:      'small_vial' | 'round_flask' | ... | 'jug'
maxCharges:     2-5 (determined by quality)
currentCharges: 2-5 (on creation = maxCharges)
healPercent:    0.08-0.30 (determined by flaskType)
icon:           'potion'
name:           "Small Vial" | "Round Flask" | ... | "Jug"
```

### In equipment (Character.equipment)

Equipped potion is stored in the JSONB `equipment` field of the character:

```typescript
{
  "consumable-1": {  // Q slot
    bagItemId: "potion_round_flask_1707123456_a1b2",
    flaskType: "round_flask",
    quality: "rare",
    maxCharges: 3,
    currentCharges: 2,  // decreases on use
    healPercent: 0.12
  },
  "consumable-2": null  // E slot — empty
}
```

---

## Equipment

### Slots

Two consumable slots: `consumable-1` (Q) and `consumable-2` (E).

### API

```
POST /loot/equip-potion   { bagItemId, slot }
  → Moves potion from bag to equipment slot
  → Not allowed during active combat

POST /loot/unequip-potion { slot }
  → Returns potion from equipment to bag (with current charges)
  → Not allowed during active combat
```

---

## Usage in Combat

### WebSocket Events

```
→ Client sends:   'combat:use-potion'  { sessionId, slot }
← Server responds: 'combat:potion-used' { slot, healAmount, playerHp, playerMaxHp, remainingCharges, maxCharges }
```

### Server Logic

1. Get session from Redis
2. Verify: player is alive, session belongs to them
3. Load `Character.equipment[slot]`
4. Check `currentCharges > 0`
5. `healAmount = floor(playerMaxHp × healPercent)`
6. `playerCurrentHp = min(playerMaxHp, playerCurrentHp + healAmount)`
7. `currentCharges--`
8. Save character + Redis session
9. Return result to client

### Combat UI

- Q / E buttons in the combat scene `action-bar`
- Display potion sprite + charge counter (`"2/3"`)
- On click → `combat:use-potion` (with `e.stopPropagation()` to avoid triggering tap-attack)
- Green floating `+{healAmount}` on use (heal effect)
- At 0 charges — button is inactive, shows empty slot

---

## Drop Pipeline

```
1. Combat completed successfully     → combat.service.ts:completeSession()
2. Determine drop config:
   - location → LOCATION_POTION_DROPS[act]
   - map      → getMapPotionDropConfig(tier)
   - boss_map → BOSS_MAP_POTION_DROP
3. rollPotionDrop(config)           → shared/potion-drops.ts
4. If dropped → addItemsToBag()     → loot.service.ts → DB
5. Include in client response       → mapDrops[]
6. FE: display in Victory screen    → victory-scene.ts
```

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/potion-drops.ts` | Flask definitions, drop tables, `rollPotionDrop()` |
| `shared/types.ts` | `BagItemData` with potion fields |
| `server/src/shared/entities/bag-item.entity.ts` | Columns: flaskType, maxCharges, currentCharges, healPercent |
| `server/src/loot/loot.service.ts` | Methods `rollLocationPotionDrop()`, `rollMapPotionDrop()` |
| `server/src/loot/loot.controller.ts` | Equip/unequip endpoints |
| `server/src/combat/combat.service.ts` | `usePotion()` + drop in `completeSession()` |
| `server/src/combat/combat.gateway.ts` | Event `combat:use-potion` |
| `bot/src/scenes/combat-scene.ts` | Q/E button UI |
| `bot/src/ui/equipment.ts` | Potion rendering in equipment |
