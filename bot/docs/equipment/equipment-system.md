# Equipment System - Game Design Document

## Overview

PoE-style equipment system (simplified). Each item is an object with type, rarity, level, and a set of random stats.

---

## Equipment Types (Equipment Slots)

| Slot          | Code          | Description                       |
|---------------|---------------|-----------------------------------|
| One-Hand      | `one_hand`    | One-hand weapon (sword, axe, wand) |
| Two-Hand      | `two_hand`    | Two-hand weapon (bow, staff, greatsword) |
| Helmet        | `helmet`      | Helmet                            |
| Amulet        | `amulet`      | Amulet (necklace)                 |
| Armor         | `armor`       | Body armour / chest piece         |
| Ring          | `ring`        | Ring (2 slots: left_ring, right_ring) |
| Gloves        | `gloves`      | Gloves                            |
| Belt          | `belt`        | Belt                              |
| Boots         | `boots`       | Boots                             |

---

## Rarity

| Rarity    | Colour      | Hex       | Stat Count    | Drop weight |
|-----------|-------------|-----------|---------------|-------------|
| Common    | Grey        | `#9d9d9d` | 1-2           | 60%         |
| Rare      | Blue        | `#4488ff` | 2-3           | 25%         |
| Epic      | Purple      | `#a335ee` | 3-4           | 12%         |
| Legendary | Orange      | `#ff8000` | 4-6           | 3%          |

The higher the rarity, the more stats an item has and the wider the range of their values.

---

## Item Level and Requirements

### Item Level (iLvl): 0 - 100

Item level determines the power of its stats. The higher the iLvl, the higher the ceiling of values.

### Required Level (reqLvl): 0 - 75

Character level required to equip the item.

### reqLvl Formula from iLvl

```
reqLvl = Math.floor(iLvl * 0.75)
```

| Item Level (iLvl) | Required Level (reqLvl) |
|--------------------|------------------------|
| 1                  | 0                      |
| 10                 | 7                      |
| 20                 | 15                     |
| 30                 | 22                     |
| 40                 | 30                     |
| 50                 | 37                     |
| 60                 | 45                     |
| 70                 | 52                     |
| 80                 | 60                     |
| 90                 | 67                     |
| 100                | 75                     |

---

## Stat System (Stat Tiers)

Item stats are determined by **tiers**. Tier depends on the item's iLvl.

### Tiers by iLvl

| Tier | iLvl Range    | Description     |
|------|---------------|-----------------|
| T5   | 1 - 19        | Starting        |
| T4   | 20 - 39       | Mid-level       |
| T3   | 40 - 59       | Advanced        |
| T2   | 60 - 79       | Master          |
| T1   | 80 - 100      | Legendary       |

### Scaling Principle

- **Minimum stat value is the same for all tiers** (floor does not grow)
- **Maximum value grows with tier** (ceiling rises)
- This means: an iLvl 10 item CAN drop with a minimum stat, but NEVER with a top one
- An iLvl 100 item can also drop with the minimum, but has a chance for the maximum

### Scaling Example (Flat Physical Damage)

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 1    | 8    |
| T4   | 20 - 39   | 1    | 18   |
| T3   | 40 - 59   | 1    | 35   |
| T2   | 60 - 79   | 1    | 60   |
| T1   | 80 - 100  | 1    | 100  |

---

## Stat Categories

### Offensive

| Stat ID              | Name                       | Unit    | Description                           |
|----------------------|----------------------------|---------|---------------------------------------|
| `flat_phys_dmg`      | Flat Physical Damage       | +N      | Flat physical damage added to attacks |
| `pct_phys_dmg`       | % Physical Damage          | +N%     | Percentage bonus to physical damage   |
| `flat_fire_dmg`      | Flat Fire Damage           | +N      | Flat fire damage                      |
| `flat_cold_dmg`      | Flat Cold Damage           | +N      | Flat cold damage                      |
| `flat_lightning_dmg`  | Flat Lightning Damage     | +N      | Flat lightning damage                 |
| `crit_chance`        | Critical Strike Chance     | +N%     | Critical strike chance                |
| `crit_multiplier`    | Critical Strike Multiplier | +N%     | Critical strike multiplier            |

### Defensive

| Stat ID              | Name                       | Unit    | Description                           |
|----------------------|----------------------------|---------|---------------------------------------|
| `flat_hp`            | Flat Life                  | +N      | Flat life                             |
| `pct_hp`             | % Increased Life           | +N%     | Percentage bonus to life              |
| `flat_armor`         | Flat Armour                | +N      | Flat armour                           |
| `pct_armor`          | % Increased Armour         | +N%     | Percentage bonus to armour            |
| `flat_evasion`       | Flat Evasion               | +N      | Flat evasion                          |
| `pct_evasion`        | % Increased Evasion        | +N%     | Percentage bonus to evasion           |
| `flat_energy_shield` | Flat Energy Shield         | +N      | Flat energy shield                    |
| `pct_energy_shield`  | % Increased Energy Shield  | +N%     | Percentage bonus to energy shield     |
| `block_chance`       | Block Chance               | +N%     | Block chance                          |
| `fire_res`           | Fire Resistance            | +N%     | Fire damage reduction                 |
| `cold_res`           | Cold Resistance            | +N%     | Cold damage reduction                 |
| `lightning_res`      | Lightning Resistance       | +N%     | Lightning damage reduction            |
| `phys_res`           | Physical Resistance        | +N%     | Physical damage reduction             |

### Utility

| Stat ID              | Name                       | Unit    | Description                           |
|----------------------|----------------------------|---------|---------------------------------------|
| `gold_find`          | Gold Find                  | +N%     | Bonus to gold found                   |
| `xp_bonus`           | Experience Bonus           | +N%     | Bonus to experience gained            |
| `life_regen`         | Life Regeneration          | +N/s    | Life regeneration per second          |
| `life_on_hit`        | Life on Hit                | +N      | HP restored per hit                   |
| `passive_dps_bonus`  | Passive DPS Bonus          | +N%     | Bonus to passive damage               |

---

## Available Stats per Equipment Type

| Stat / Slot         | One-Hand | Two-Hand | Helmet | Amulet | Armor | Ring | Gloves | Belt | Boots |
|---------------------|----------|----------|--------|--------|-------|------|--------|------|-------|
| flat_phys_dmg       | +        | +        |        |        |       |      |        |      |       |
| pct_phys_dmg        | +        | +        |        | +      |       | +    | +      |      |       |
| flat_fire_dmg       | +        | +        |        | +      |       | +    |        |      |       |
| flat_cold_dmg       | +        | +        |        | +      |       | +    |        |      |       |
| flat_lightning_dmg  | +        | +        |        | +      |       | +    |        |      |       |
| crit_chance         | +        | +        |        | +      |       | +    | +      |      |       |
| crit_multiplier     | +        | +        |        | +      |       | +    |        |      |       |
| flat_hp             |          |          | +      | +      | +     | +    |        | +    | +     |
| pct_hp              |          |          | +      | +      | +     | +    |        | +    |       |
| flat_armor          |          |          | +      |        | +     |      | +      | +    | +     |
| pct_armor           |          |          | +      |        | +     |      |        |      |       |
| flat_evasion        |          |          | +      |        | +     |      | +      |      | +     |
| pct_evasion         |          |          | +      |        | +     |      |        |      |       |
| flat_energy_shield  |          |          | +      |        | +     |      | +      |      | +     |
| pct_energy_shield   |          |          | +      |        | +     |      |        |      |       |
| block_chance        | +        |          |        |        |       |      |        |      |       |
| fire_res            |          |          | +      | +      | +     | +    |        | +    | +     |
| cold_res            |          |          | +      | +      | +     | +    |        | +    | +     |
| lightning_res       |          |          | +      | +      | +     | +    |        | +    | +     |
| phys_res            |          |          | +      | +      | +     | +    |        | +    |       |
| gold_find           |          |          |        | +      |       | +    |        | +    |       |
| xp_bonus            |          |          | +      | +      |       | +    |        |      |       |
| life_regen          |          |          |        | +      | +     | +    |        | +    |       |
| life_on_hit         | +        | +        |        |        |       | +    | +      |      |       |
| passive_dps_bonus   |          |          |        | +      |       | +    |        |      |       |

---

## OOP Item Structure

```javascript
class Equipment {
  constructor({ type, rarity, itemLevel }) {
    this.id = generateId();
    this.type = type;           // 'one_hand' | 'two_hand' | 'helmet' | ...
    this.rarity = rarity;       // 'common' | 'rare' | 'epic' | 'legendary'
    this.itemLevel = itemLevel; // 0-100
    this.reqLevel = Math.floor(itemLevel * 0.75); // 0-75
    this.stats = [];            // [{ id: 'flat_phys_dmg', value: 15 }, ...]
    this.name = '';             // Generated name
  }
}
```

### Stat Generation

```javascript
// 1. Determine stat count by rarity
const statCount = rollStatCount(this.rarity);

// 2. Get the pool of available stats for this equipment type
const pool = STAT_POOLS[this.type];

// 3. Randomly pick N stats without duplicates
const selectedStats = pickRandom(pool, statCount);

// 4. For each stat, determine tier by iLvl and roll the value
for (const statId of selectedStats) {
  const tier = getTierByLevel(this.itemLevel);
  const { min, max } = STAT_RANGES[statId][tier];
  const value = randomInt(min, max);
  this.stats.push({ id: statId, value });
}
```

---

## Documentation by Type

Each equipment type is described in a separate file:

- [One-Hand Weapons](./one-hand-weapons.md)
- [Two-Hand Weapons](./two-hand-weapons.md)
- [Helmets](./helmets.md)
- [Amulets](./amulets.md)
- [Armor](./armor.md)
- [Rings](./rings.md)
- [Gloves](./gloves.md)
- [Belts](./belts.md)
- [Boots](./boots.md)
