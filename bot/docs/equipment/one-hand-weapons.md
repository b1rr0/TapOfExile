# One-Hand Weapons

**Slot:** `one_hand`
**Description:** One-hand weapons — swords, axes, wands, daggers. Allows using a shield or a second weapon in the off-hand.

---

## Subtypes

| Subtype         | Code           | Feature                         |
|-----------------|----------------|---------------------------------|
| Sword           | `oh_sword`    | Balance of damage and crit      |
| Axe             | `oh_axe`      | High phys. damage               |
| Dagger          | `oh_dagger`   | High crit                       |
| Wand            | `oh_wand`     | Elemental damage                |
| Mace            | `oh_mace`     | High damage, low speed          |

---

## Base Stats (implicit)

Each one-hand weapon has base damage depending on iLvl:

| Tier | iLvl      | Base Damage (min-max) |
|------|-----------|-----------------------|
| T5   | 1 - 19    | 3 - 8                 |
| T4   | 20 - 39   | 7 - 18                |
| T3   | 40 - 59   | 15 - 35               |
| T2   | 60 - 79   | 28 - 55               |
| T1   | 80 - 100  | 45 - 90               |

---

## Available Stats and Ranges

### Flat Physical Damage (`flat_phys_dmg`)
Added physical damage to attacks.

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 5   |
| T4   | 20 - 39   | 1   | 12  |
| T3   | 40 - 59   | 1   | 25  |
| T2   | 60 - 79   | 1   | 45  |
| T1   | 80 - 100  | 1   | 75  |

### % Physical Damage (`pct_phys_dmg`)
Percentage bonus to weapon physical damage.

| Tier | iLvl      | Min | Max  |
|------|-----------|-----|------|
| T5   | 1 - 19    | 5%  | 20%  |
| T4   | 20 - 39   | 5%  | 40%  |
| T3   | 40 - 59   | 5%  | 70%  |
| T2   | 60 - 79   | 5%  | 110% |
| T1   | 80 - 100  | 5%  | 160% |

### Flat Fire Damage (`flat_fire_dmg`)
Added fire damage.

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 4   |
| T4   | 20 - 39   | 1   | 10  |
| T3   | 40 - 59   | 1   | 20  |
| T2   | 60 - 79   | 1   | 38  |
| T1   | 80 - 100  | 1   | 60  |

### Flat Cold Damage (`flat_cold_dmg`)
Added cold damage.

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 4   |
| T4   | 20 - 39   | 1   | 10  |
| T3   | 40 - 59   | 1   | 20  |
| T2   | 60 - 79   | 1   | 38  |
| T1   | 80 - 100  | 1   | 60  |

### Flat Lightning Damage (`flat_lightning_dmg`)
Added lightning damage. Wide range (from 1 to max).

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 6   |
| T4   | 20 - 39   | 1   | 15  |
| T3   | 40 - 59   | 1   | 30  |
| T2   | 60 - 79   | 1   | 50  |
| T1   | 80 - 100  | 1   | 80  |

### Critical Strike Chance (`crit_chance`)
Added critical strike chance.

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 0.5% | 2%   |
| T4   | 20 - 39   | 0.5% | 4%   |
| T3   | 40 - 59   | 0.5% | 6%   |
| T2   | 60 - 79   | 0.5% | 9%   |
| T1   | 80 - 100  | 0.5% | 12%  |

### Critical Strike Multiplier (`crit_multiplier`)
Added critical damage multiplier.

| Tier | iLvl      | Min  | Max  |
|------|-----------|------|------|
| T5   | 1 - 19    | 5%   | 15%  |
| T4   | 20 - 39   | 5%   | 25%  |
| T3   | 40 - 59   | 5%   | 40%  |
| T2   | 60 - 79   | 5%   | 60%  |
| T1   | 80 - 100  | 5%   | 85%  |

### Block Chance (`block_chance`)
Block chance (one-hand weapons only).

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1%  | 3%  |
| T4   | 20 - 39   | 1%  | 5%  |
| T3   | 40 - 59   | 1%  | 8%  |
| T2   | 60 - 79   | 1%  | 12% |
| T1   | 80 - 100  | 1%  | 15% |

### Life on Hit (`life_on_hit`)
HP restored per hit.

| Tier | iLvl      | Min | Max |
|------|-----------|-----|-----|
| T5   | 1 - 19    | 1   | 3   |
| T4   | 20 - 39   | 1   | 7   |
| T3   | 40 - 59   | 1   | 14  |
| T2   | 60 - 79   | 1   | 22  |
| T1   | 80 - 100  | 1   | 35  |

---

## Generation Example

**iLvl 45, Rare One-Hand Sword:**
```
Crimson Edge (One-Hand Sword)
Item Level: 45 | Required Level: 33
Rarity: Rare

Base Damage: 22
---
+ 18 Physical Damage
+ 35% Physical Damage
+ 3.5% Critical Strike Chance
```

**iLvl 92, Legendary One-Hand Dagger:**
```
Shadowfang (One-Hand Dagger)
Item Level: 92 | Required Level: 69
Rarity: Legendary

Base Damage: 78
---
+ 65 Physical Damage
+ 140% Physical Damage
+ 10% Critical Strike Chance
+ 72% Critical Strike Multiplier
+ 28 Life on Hit
```
